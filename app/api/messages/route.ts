import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, looksLikeSpam } from '@/lib/antiSpam';
import { uploadImage } from '@/lib/cloudinary';
import { getOrCreateConversation, sortedPair } from '@/lib/conversation';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

    const senderId = (session.user as any).id;
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    if (!sender || sender.banned) {
      return NextResponse.json({ error: 'Tvoj účet bol zablokovaný.' }, { status: 403 });
    }

    const { receiverId, body, image } = await req.json();

    if (!receiverId || receiverId === senderId) {
      return NextResponse.json({ error: 'Neplatný príjemca.' }, { status: 400 });
    }
    if ((!body || !String(body).trim()) && !image) {
      return NextResponse.json({ error: 'Správa nemôže byť prázdna.' }, { status: 400 });
    }
    if (body && String(body).length > 3000) {
      return NextResponse.json({ error: 'Správa je príliš dlhá.' }, { status: 400 });
    }
    if (body) {
      const spamReason = looksLikeSpam(String(body));
      if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });
    }

    const rateLimitError = await checkRateLimit('message', senderId, sender.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return NextResponse.json({ error: 'Príjemca sa nenašiel.' }, { status: 404 });

    const blocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: senderId }
        ]
      }
    });
    if (blocked) {
      const message = blocked.blockerId === senderId ? 'Tohto používateľa si zablokoval.' : 'Tento používateľ ťa zablokoval.';
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
        return NextResponse.json({ error: `Fotku môžeš poslať len raz za 20 minút. Skús to znova o ${waitMinutes} min.` }, { status: 429 });
      }
    }

    let imageUrl = image || null;
    if (imageUrl && imageUrl.startsWith('data:image')) {
      imageUrl = await uploadImage(imageUrl, 'messages');
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        body: body ? String(body).trim() : null,
        image: imageUrl
      }
    });

    return NextResponse.json({ ...message, conversationStatus: conversation.status }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Táto akcia sa už spracováva alebo bola vykonaná.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Požiadavka zlyhala. Skús to prosím znova.' }, { status: 400 });
  }
}
