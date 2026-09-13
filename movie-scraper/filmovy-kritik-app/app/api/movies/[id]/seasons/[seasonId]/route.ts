import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Po zmene alebo zmazaní série vždy prepočíta dátum premiéry filmu v tej istej
// transakcii — nesmie sa stať, že sa séria zmení, ale dátum premiéry ostane starý.
async function recomputeMovieReleaseDate(tx: any, movieId: string) {
  const seasons = await tx.season.findMany({ where: { movieId }, orderBy: { number: 'desc' }, take: 1 });
  const latest = seasons[0];
  if (!latest) return;

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 5);

  await tx.movie.update({ where: { id: movieId }, data: { releaseDate: latest.released ? pastDate : farFuture } });
}

export async function PATCH(req: Request, { params }: { params: { id: string; seasonId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, any> = {};

  if ('number' in body) {
    const num = Number(body.number);
    if (!Number.isFinite(num) || num < 1) return NextResponse.json({ error: 'Zadaj platné číslo série.' }, { status: 400 });
    data.number = num;
  }
  if ('episodeCount' in body) {
    const epCount = Number(body.episodeCount) || 0;
    if (epCount < 0 || epCount > 200) return NextResponse.json({ error: 'Neplatný počet epizód.' }, { status: 400 });
    data.episodeCount = epCount;
  }
  if ('year' in body) {
    const yearNum = Number(body.year);
    if (!Number.isFinite(yearNum) || yearNum < 1900 || yearNum > 2100) {
      return NextResponse.json({ error: 'Zadaj platný rok.' }, { status: 400 });
    }
    data.year = String(yearNum);
  }
  // Ručný prepínač — admin priamo rozhodne, či séria (a teda aj celý seriál)
  // je vydaná, bez ohľadu na akýkoľvek automatický odhad podľa dátumu.
  if ('released' in body) {
    data.released = !!body.released;
    data.releaseDate = data.released ? new Date() : null;
  }

  const before = await prisma.season.findUnique({
    where: { id: params.seasonId, movieId: params.id },
    select: { number: true, released: true }
  });

  await prisma.$transaction(async (tx) => {
    await tx.season.updateMany({ where: { id: params.seasonId, movieId: params.id }, data });
    await recomputeMovieReleaseDate(tx, params.id);
  });

  // Ak sa séria práve TERAZ prvýkrát stala vydanou (typický postup — séria sa
  // pridá vopred, kým ešte nemá premiéru, a admin ju označí ako vydanú neskôr),
  // upozorníme každého, kto má tento seriál v "Chcem vidieť".
  if (before && !before.released && data.released === true) {
    const movie = await prisma.movie.findUnique({ where: { id: params.id }, select: { title: true, slug: true } });
    const watchers = await prisma.watchlistItem.findMany({ where: { movieId: params.id }, select: { userId: true } });
    if (movie && watchers.length > 0) {
      await prisma.notification.createMany({
        data: watchers.map((w) => ({
          userId: w.userId,
          actorName: 'PunisherEDNA',
          type: 'NEW_EPISODE',
          text: `Pribudla nová séria ${before.number} pri seriáli "${movie.title}", ktorý máš v Chcem vidieť!`,
          link: `/movie/${movie.slug}/sezona/${before.number}`
        }))
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string; seasonId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.season.deleteMany({ where: { id: params.seasonId, movieId: params.id } });
    await recomputeMovieReleaseDate(tx, params.id);
  });

  return NextResponse.json({ ok: true });
}
