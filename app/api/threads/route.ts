import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, looksLikeSpam } from '@/lib/antiSpam';

export async function GET() {
  const threads = await prisma.thread.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      movie: { select: { title: true, slug: true } },
      _count: { select: { posts: true } }
    }
  });
  return NextResponse.json(threads);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Pro založení vlákna se musíš přihlásit.' }, { status: 401 });

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.banned) return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });

    const { title, body, movieId } = await req.json();
    if (!title || !String(title).trim()) return NextResponse.json({ error: 'Zadaj názov témy.' }, { status: 400 });
    if (!body || !String(body).trim()) return NextResponse.json({ error: 'Text nemůže být prázdný.' }, { status: 400 });

    const spamReason = looksLikeSpam(String(title)) || looksLikeSpam(String(body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

    const rateLimitError = await checkRateLimit('thread', userId, user.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });


    const thread = await prisma.thread.create({
      data: {
        title: String(title).trim(),
        body: String(body).trim(),
        authorId: userId,
        movieId: movieId || null
      }
    });

    return NextResponse.json(thread, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Tato akce se už zpracovává nebo byla provedena.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Požadavek selhal. Zkus to prosím znovu.' }, { status: 400 });
  }
}
