import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { checkRateLimit, looksLikeSpam } from '@/lib/antiSpam';
import { getOrCreateConversation } from '@/lib/conversation';
import { encryptMessageBody } from '@/lib/serverCrypto';

export const dynamic = 'force-dynamic';

// Appková verzia webu — rovnaký systém súhlasu s komunikáciou, spamový
// filter aj limit. Fotky zatiaľ appka neposiela (len web).
export async function POST(req: Request) {
  try {
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ error: 'Neplatné alebo vypršané prihlásenie.' }, { status: 401 });

    const senderId = user.id;
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    if (!sender || sender.banned) {
      return NextResponse.json({ error: 'Tvoj účet bol zablokovaný.' }, { status: 403 });
    }

    const { receiverId, body } = await req.json();

    if (!receiverId || receiverId === senderId) {
      return NextResponse.json({ error: 'Neplatný příjemce.' }, { status: 400 });
    }
    if (!body || !String(body).trim()) {
      return NextResponse.json({ error: 'Zpráva nemůže být prázdná.' }, { status: 400 });
    }
    if (String(body).length > 3000) {
      return NextResponse.json({ error: 'Zpráva je příliš dlouhá.' }, { status: 400 });
    }
    const spamReason = looksLikeSpam(String(body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

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

    const encrypted = encryptMessageBody(String(body).trim());

    const message = await prisma.message.create({
      data: { senderId, receiverId, body: encrypted.ciphertext, iv: encrypted.iv }
    });

    return NextResponse.json({ id: message.id, body: String(body).trim(), createdAt: message.createdAt, conversationStatus: conversation.status }, { status: 201 });
  } catch (error: any) {
    console.error('[api/mobile/messages/send]', error);
    return NextResponse.json({ error: 'Požadavek selhal. Zkus to prosím znovu.' }, { status: 400 });
  }
}
