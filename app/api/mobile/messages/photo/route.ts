import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { checkRateLimit, looksLikeSpam } from '@/lib/antiSpam';
import { getOrCreateConversation } from '@/lib/conversation';
import { encryptMessageBody } from '@/lib/serverCrypto';
import { sendMessagePush, setTyping } from '@/lib/chatRealtime';
import { validReplyTo } from '@/lib/messageActions';
import { PHOTO_MAX_BYTES, PHOTO_TTL_MS, checkPhotoLimits, destroyChatPhoto, photoView, uploadChatPhoto } from '@/lib/photoMessages';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Odoslanie JEDNEJ fotky z appky (appka pri viacerých fotkách volá túto
// routu postupne). Voliteľný text („body“) sa pripojí k fotke.
// Limity: max. 5 naraz, 10 za deň, fotka zostane 24 h.
export async function POST(req: Request) {
  let uploadedId: string | null = null;
  try {
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const senderId = user.id;
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    if (!sender || sender.banned) return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });

    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });

    const receiverId = form.get('receiverId');
    const rawBody = form.get('body');
    const file = form.get('file');
    const body = typeof rawBody === 'string' ? rawBody.trim() : '';

    if (typeof receiverId !== 'string' || !receiverId || receiverId.length > 64 || receiverId === senderId) {
      return NextResponse.json({ error: 'Neplatný příjemce.' }, { status: 400 });
    }
    if (!file || typeof file === 'string' || typeof (file as any).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Chybí fotka.' }, { status: 400 });
    }
    const blob = file as Blob;
    if (blob.size < 100) return NextResponse.json({ error: 'Fotka je poškozená.' }, { status: 400 });
    if (blob.size > PHOTO_MAX_BYTES) return NextResponse.json({ error: 'Fotka je příliš velká.' }, { status: 413 });
    if (body.length > 3000) return NextResponse.json({ error: 'Zpráva je příliš dlouhá.' }, { status: 400 });
    if (body) {
      const spamReason = looksLikeSpam(body);
      if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });
    }
    const mime = blob.type && /^image\//.test(blob.type) ? blob.type : 'image/jpeg';

    const limits = await checkPhotoLimits(senderId);
    if (limits.error) return NextResponse.json({ error: limits.error, leftToday: limits.leftToday }, { status: 429 });

    const rateLimitError = await checkRateLimit('message', senderId, sender.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
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

    const conversation = await getOrCreateConversation(senderId, receiverId, senderId);
    if (conversation.status === 'DECLINED') {
      return NextResponse.json({ error: 'Tato osoba odmítla s tebou komunikovat.' }, { status: 403 });
    }
    if (conversation.status === 'PENDING' && conversation.initiatorId === senderId) {
      const alreadySent = await prisma.message.count({ where: { senderId, receiverId } });
      if (alreadySent > 0) {
        return NextResponse.json({ error: 'Už jsi poslal jednu zprávu — počkej, až ji druhá strana potvrdí.' }, { status: 403 });
      }
    }

    const uploaded = await uploadChatPhoto(Buffer.from(await blob.arrayBuffer()), mime);
    uploadedId = uploaded.publicId;

    const replyToId = await validReplyTo(form.get('replyToId'), senderId, receiverId);
    let encryptedBody: string | null = null;
    let iv: string | null = null;
    if (body) {
      const enc = encryptMessageBody(body);
      encryptedBody = enc.ciphertext;
      iv = enc.iv;
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        body: encryptedBody,
        iv,
        image: uploaded.url,
        imagePublicId: uploaded.publicId,
        photo: true,
        imageExpiresAt: new Date(Date.now() + PHOTO_TTL_MS),
        replyToId
      }
    });
    uploadedId = null;

    await Promise.all([
      setTyping(senderId, receiverId, false).catch(() => {}),
      sendMessagePush(receiverId, { id: sender.id, name: sender.name, avatar: sender.avatar }, body ? `📷 ${body}` : '📷 Fotka')
    ]);

    return NextResponse.json(
      {
        id: message.id,
        senderId,
        body: body || null,
        read: false,
        createdAt: message.createdAt,
        ...photoView(message),
        leftToday: Math.max(0, limits.leftToday - 1),
        conversationStatus: conversation.status
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/mobile/messages/photo]', error);
    if (uploadedId) await destroyChatPhoto(uploadedId);
    return NextResponse.json({ error: 'Fotku se nepodařilo odeslat. Zkus to prosím znovu.' }, { status: 400 });
  }
}
