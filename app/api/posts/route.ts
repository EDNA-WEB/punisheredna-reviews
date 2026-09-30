import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, looksLikeSpam } from '@/lib/antiSpam';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Pro přidání příspěvku se musíš přihlásit.' }, { status: 401 });

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.banned) return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });
    if (user.commentsDisabled) {
      return NextResponse.json({ error: 'Administrátor ti obmedzil možnosť pridávať komentáre.' }, { status: 403 });
    }

    const { threadId, body } = await req.json();
    if (!threadId || !body || !String(body).trim()) {
      return NextResponse.json({ error: 'Příspěvek nemůže být prázdný.' }, { status: 400 });
    }

    const spamReason = looksLikeSpam(String(body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

    const rateLimitError = await checkRateLimit('post', userId, user.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const thread = await prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) return NextResponse.json({ error: 'Vlákno se nenašlo.' }, { status: 404 });

    const post = await prisma.post.create({
      data: { body: String(body).trim(), threadId, authorId: userId },
      include: { author: { select: { name: true, avatar: true, role: true } } }
    });

    return NextResponse.json(post, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Tato akce se už zpracovává nebo byla provedena.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Požadavek selhal. Zkus to prosím znovu.' }, { status: 400 });
  }
}
