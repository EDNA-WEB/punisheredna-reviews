import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, looksLikeSpam } from '@/lib/antiSpam';
import { uploadImage } from '@/lib/cloudinary';
import { getOrCreateConversation, sortedPair } from '@/lib/conversation';
import { encryptMessageBody } from '@/lib/serverCrypto';

import { sendMessagePush, setTyping } from '@/lib/chatRealtime';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

    const senderId = (session.user as any).id;
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    if (!sender || sender.banned) {
      return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });
    }

    const { receiverId, body, image } = await req.json();

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
      return NextResponse.json({ error: 'Táto osoba odmietla s tebou komunikovať.' }, { status: 403 });
    }
    if (conversation.status === 'PENDING' && conversation.initiatorId === senderId) {
      const alreadySent = await prisma.message.count({ where: { senderId, receiverId } });
      if (alreadySent > 0) {
        return NextResponse.json({ error: 'Už si poslal jednu správu — počkaj, kým ju druhá strana potvrdí.' }, { status: 403 });
      }
    }

    // Fotku môže poslať len raz za 20 minút (nie text, len obrázok).
    if (image) {
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
      const recentImage = await prisma.message.findFirst({
        where: { senderId, image: { not: null }, createdAt: { gte: twentyMinutesAgo } },
        orderBy: { createdAt: 'desc' }
      });
      if (recentImage) {
        const waitMinutes = Math.ceil((recentImage.createdAt.getTime() + 20 * 60 * 1000 - Date.now()) / 60000);
        return NextResponse.json({ error: `Fotku můžeš poslat jen jednou za 20 minut. Zkus to znovu za ${waitMinutes} min.` }, { status: 429 });
      }
    }

    let imageUrl = image || null;
    if (imageUrl && imageUrl.startsWith('data:image')) {
      imageUrl = await uploadImage(imageUrl, 'messages');
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

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        body: encryptedBody,
        iv,
        image: imageUrl
      }
    });

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
