import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, looksLikeSpam } from '@/lib/antiSpam';
import { uploadImage } from '@/lib/cloudinary';

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

    return NextResponse.json(message, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Táto akcia sa už spracováva alebo bola vykonaná.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Požiadavka zlyhala. Skús to prosím znova.' }, { status: 400 });
  }
}
