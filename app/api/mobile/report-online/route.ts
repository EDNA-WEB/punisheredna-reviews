import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

import { hasInjectedObject } from '@/lib/inputGuard';
export const dynamic = 'force-dynamic';

// Nahlásenie nefunkčného online odkazu — rovnaké ako web
// (app/api/movies/[id]/report-online), len s prihlásením cez appku.
export async function POST(req: Request) {
  try {
    const me = await getMobileUser(req);
    if (!me) return NextResponse.json({ error: 'Na nahlášení se musíš přihlásit.' }, { status: 401 });

    const { movieId, note } = await req.json().catch(() => ({ movieId: null, note: null }));
    if (hasInjectedObject(movieId)) return NextResponse.json({ error: 'Neplatné údaje.' }, { status: 400 });
    if (!movieId) return NextResponse.json({ error: 'Chýba movieId.' }, { status: 400 });

    const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } });
    if (!movie) return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });

    const trimmedNote = typeof note === 'string' ? note.trim().slice(0, 500) : null;
    await prisma.onlineReport.create({ data: { movieId: movie.id, reporterId: me.id, note: trimmedNote || null } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/report-online]', error);
    return NextResponse.json({ error: 'Nahlášení selhalo.' }, { status: 400 });
  }
}
