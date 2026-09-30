import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { checkRateLimit, looksLikeSpam } from '@/lib/antiSpam';
import { logActivity } from '@/lib/logActivity';

import { hasInjectedObject } from '@/lib/inputGuard';
export const dynamic = 'force-dynamic';

// Mobilná verzia /api/comments (obmedzená na newsId, appka zatiaľ
// komentuje len články) — rovnaká logika, len Bearer token namiesto
// NextAuth session.
export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Na přidání komentáře se musíš přihlásit.' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: me.id } });
    if (!user || user.banned) return NextResponse.json({ error: 'Tvůj účet byl zablokován.' }, { status: 403 });
    if (user.commentsDisabled) return NextResponse.json({ error: 'Administrátor ti omezil možnost přidávat komentáře.' }, { status: 403 });

    const { newsId, parentId, body } = await req.json();
    if (hasInjectedObject(newsId)) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });
    if (!newsId || !body || !String(body).trim()) return NextResponse.json({ error: 'Text komentáře nemůže být prázdný.' }, { status: 400 });
    if (String(body).length > 3000) return NextResponse.json({ error: 'Komentář je příliš dlouhý.' }, { status: 400 });

    const spamReason = looksLikeSpam(String(body));
    if (spamReason) return NextResponse.json({ error: spamReason }, { status: 400 });

    const news = await prisma.newsPost.findUnique({ where: { id: newsId }, select: { slug: true, title: true, authorId: true } });
    if (!news) return NextResponse.json({ error: 'Článek se nenašel.' }, { status: 404 });

    const rateLimitError = await checkRateLimit('comment', user.id, user.createdAt);
    if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 });

    const comment = await prisma.comment.create({
      data: { newsId, parentId: parentId || null, body: String(body).trim(), userId: user.id },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    });

    logActivity(user.id, `Komentár k novinke ${news.title}`, `/news/${news.slug}`);

    return NextResponse.json(
      { id: comment.id, body: comment.body, createdAt: comment.createdAt, user: comment.user, likesCount: 0, likedByMe: false, replies: [] },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/mobile/news-comment]', error);
    return NextResponse.json({ error: 'Odeslání se nezdařilo.' }, { status: 400 });
  }
}
