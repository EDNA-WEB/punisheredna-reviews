import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { number, year, episodeCount } = await req.json();
  const num = Number(number);
  if (!Number.isFinite(num) || num < 1) {
    return NextResponse.json({ error: 'Zadaj platné číslo série.' }, { status: 400 });
  }
  const yearNum = Number(year);
  if (!Number.isFinite(yearNum) || yearNum < 1900 || yearNum > 2100) {
    return NextResponse.json({ error: 'Zadaj platný rok.' }, { status: 400 });
  }
  const epCount = Number(episodeCount) || 0;
  if (epCount < 0 || epCount > 200) {
    return NextResponse.json({ error: 'Neplatný počet epizód.' }, { status: 400 });
  }

  const existing = await prisma.season.findUnique({ where: { movieId_number: { movieId: params.id, number: num } } }).catch(() => null);
  if (existing) return NextResponse.json({ error: `Séria ${num} už existuje.` }, { status: 400 });

  const count = await prisma.season.count({ where: { movieId: params.id } });

  // Bezpečný predvolený odhad: minulý rok = určite vydaná, tento rok alebo
  // budúci = radšej označiť ako ešte nevydanú, kým to admin ručne nepotvrdí.
  const currentYear = new Date().getFullYear();
  const released = yearNum < currentYear;

  // Vytvorenie série (s epizódami) a prepočet dátumu premiéry filmu musia prebehnúť
  // spolu, atomicky — ak by druhý krok zlyhal, séria by ostala vytvorená, ale film
  // by ukazoval starý (nesprávny) dátum premiéry.
  const season = await prisma.$transaction(async (tx) => {
    const created = await tx.season.create({
      data: {
        movieId: params.id,
        number: num,
        year: String(yearNum),
        episodeCount: epCount,
        released,
        releaseDate: released ? new Date(yearNum, 0, 1) : null,
        order: count,
        episodes: {
          create: Array.from({ length: epCount }, (_, i) => ({ number: i + 1, order: i }))
        }
      },
      include: { episodes: { orderBy: { number: 'asc' } } }
    });

    const seasons = await tx.season.findMany({ where: { movieId: params.id }, orderBy: { number: 'desc' }, take: 1 });
    const latest = seasons[0];
    if (latest) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 5);
      await tx.movie.update({ where: { id: params.id }, data: { releaseDate: latest.released ? pastDate : farFuture } });
    }

    return created;
  });

  const movie = await prisma.movie.findUnique({ where: { id: params.id }, select: { title: true, slug: true } });

  if (released && movie) {
    const watchers = await prisma.watchlistItem.findMany({ where: { movieId: params.id }, select: { userId: true } });
    if (watchers.length > 0) {
      await prisma.notification.createMany({
        data: watchers.map((w) => ({
          userId: w.userId,
          actorName: 'PunisherEDNA',
          type: 'NEW_EPISODE',
          text: `Pribudla nová séria ${num} pri seriáli "${movie.title}", ktorý máš v Chcem vidieť!`,
          link: `/movie/${movie.slug}/sezona/${num}`
        }))
      });
    }
  }

  return NextResponse.json(season);
}
