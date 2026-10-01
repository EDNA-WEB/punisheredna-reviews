import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, looksLikeSpam } from '@/lib/antiSpam';
import { getOrCreateConversation, sortedPair } from '@/lib/conversation';
import { encryptMessageBody } from '@/lib/serverCrypto';

import { sendMessagePush, setTyping } from '@/lib/chatRealtime';

import { hasInjectedObject } from '@/lib/inputGuard';
import { validReplyTo } from '@/lib/messageActions';
import { PHOTO_TTL_MS, checkPhotoLimits, destroyChatPhoto, uploadChatPhoto } from '@/lib/photoMessages';
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

    const senderId = (session.user as any).id;
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    if (!sender || sender.banned) {
      return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });
    }

    const { receiverId, body, image, replyToId: rawReplyTo } = await req.json();
    if (hasInjectedObject(receiverId)) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });

    if (!receiverId || receiverId === senderId) {
      return NextResponse.json({ error: 'Neplatný príjemca.' }, { status: 400 });
    }
    if ((!body || !String(body).trim()) && !image) {
      return NextResponse.json({ error: 'Zpráva nemůže být prázdná.' }, { status: 400 });
    }
    if (body && String(body).length > 3000) {
      return NextResponse.json({ error: 'Zpráva je příliš dlouhá.' }, { status: 400 });
    }
    if (body) {
      const spamReason = looksLikeSpam(String(body));
      if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });
    }

    const rateLimitError = await checkRateLimit('message', senderId, sender.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return NextResponse.json({ error: 'Příjemce se nenašel.' }, { status: 404 });

    const blocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: senderId }
        ]
      }
    });
    if (blocked) {
      const message = blocked.blockerId === senderId ? 'Tohoto uživatele jsi zablokoval.' : 'Tento uživatel tě zablokoval.';
      return NextResponse.json({ error: message }, { status: 403 });
    }

    // Súhlas s komunikáciou — kým adresát prvú správu výslovne neprijme,
    // odosielateľ (ten, kto konverzáciu začal) nemôže poslať ďalšiu. Ak adresát
    // konverzáciu zamietol, odosielateľ už nemôže poslať vôbec nič.
    const conversation = await getOrCreateConversation(senderId, receiverId, senderId);
    if (conversation.status === 'DECLINED') {
      return NextResponse.json({ error: 'Tato osoba s tebou odmítla komunikovat.' }, { status: 403 });
    }
    if (conversation.status === 'PENDING' && conversation.initiatorId === senderId) {
      const alreadySent = await prisma.message.count({ where: { senderId, receiverId } });
      if (alreadySent > 0) {
        return NextResponse.json({ error: 'Už si poslal jednu správu — počkaj, kým ju druhá strana potvrdí.' }, { status: 403 });
      }
    }

    // Fotky: max. 5 naraz, 10 za deň, zostanú 24 h (rovnako ako v appke).
    // Prijímame LEN fotku nahratú z prehliadača (data:image…), nie cudziu URL.
    if (image && (typeof image !== 'string' || !image.startsWith('data:image/') || image.length > 6_000_000)) {
      return NextResponse.json({ error: 'Neplatná fotka.' }, { status: 400 });
    }
    if (image) {
      const limits = await checkPhotoLimits(senderId);
      if (limits.error) return NextResponse.json({ error: limits.error }, { status: 429 });
    }

    let imageUrl: string | null = null;
    let imagePublicId: string | null = null;
    if (image) {
      const uploaded = await uploadChatPhoto(image);
      imageUrl = uploaded.url;
      imagePublicId = uploaded.publicId;
    }

    // Text sa šifruje priamo tu, na serveri — spoľahlivo, bez závislosti na
    // tom, aké zariadenie/prehliadač odosielateľ alebo príjemca používa.
    let encryptedBody: string | null = null;
    let iv: string | null = null;
    if (body && String(body).trim()) {
      const encrypted = encryptMessageBody(String(body).trim());
      encryptedBody = encrypted.ciphertext;
      iv = encrypted.iv;
    }

    const replyToId = await validReplyTo(rawReplyTo, senderId, receiverId);
    let message;
    try {
      message = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          body: encryptedBody,
          iv,
          image: imageUrl,
          imagePublicId,
          photo: !!imageUrl,
          imageExpiresAt: imageUrl ? new Date(Date.now() + PHOTO_TTL_MS) : null,
          replyToId
        }
      });
    } catch (e) {
      if (imagePublicId) await destroyChatPhoto(imagePublicId);
      throw e;
    }

    // Ukončí "píše…" a pošle adresátovi push notifikáciu do appky (ak ju má).
    await Promise.all([
      setTyping(senderId, receiverId, false).catch(() => {}),
      sendMessagePush(
        receiverId,
        { id: sender.id, name: sender.name, avatar: sender.avatar },
        body && String(body).trim() ? String(body).trim() : '📷 Fotka'
      )
    ]);

    return NextResponse.json({ ...message, body: body ? String(body).trim() : null, conversationStatus: conversation.status }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Tato akce se už zpracovává nebo byla provedena.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Požadavek selhal. Zkus to prosím znovu.' }, { status: 400 });
  }
}
