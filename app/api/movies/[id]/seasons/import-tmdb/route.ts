import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetTvSeasonsList, tmdbGetSeasonEpisodes } from '@/lib/tmdb';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: params.id }, select: { tmdbId: true } });
  if (!movie?.tmdbId) {
    return NextResponse.json({ error: 'Tento seriál nie je prepojený s TMDb.' }, { status: 400 });
  }

  const existingSeasons = await prisma.season.findMany({ where: { movieId: params.id }, select: { number: true } });
  const existingNumbers = new Set(existingSeasons.map((s) => s.number));

  const tmdbSeasons = await tmdbGetTvSeasonsList(movie.tmdbId);
  const currentYear = new Date().getFullYear();
  let created = 0;

  for (const s of tmdbSeasons) {
    if (existingNumbers.has(s.number)) continue; // sériu, čo už máme, nepreskakujeme aj tak neprepíšeme
    const episodes = await tmdbGetSeasonEpisodes(movie.tmdbId, s.number);
    const yearNum = Number(s.year) || currentYear;
    const released = yearNum < currentYear;

    const count = await prisma.season.count({ where: { movieId: params.id } });
    await prisma.season.create({
      data: {
        movieId: params.id,
        number: s.number,
        year: s.year || String(currentYear),
        episodeCount: episodes.length || s.episodeCount,
        released,
        releaseDate: released ? new Date(yearNum, 0, 1) : null,
        order: count,
        episodes: {
          create: (episodes.length > 0 ? episodes : Array.from({ length: s.episodeCount }, (_, i) => ({ number: i + 1, title: '', synopsis: '', stillUrl: null }))).map(
            (e, i) => ({
              number: e.number,
              title: e.title || null,
              synopsis: e.synopsis || null,
              order: i,
              photos: e.stillUrl ? { create: [{ movieId: params.id, thumbnail: e.stillUrl, full: e.stillUrl }] } : undefined
            })
          )
        }
      }
    });
    created++;
  }

  // Prepočet dátumu premiéry filmu podľa najnovšej série, rovnaká logika ako pri ručnom pridaní.
  const latestSeasons = await prisma.season.findMany({ where: { movieId: params.id }, orderBy: { number: 'desc' }, take: 1 });
  const latest = latestSeasons[0];
  if (latest) {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 5);
    await prisma.movie.update({ where: { id: params.id }, data: { releaseDate: latest.released ? pastDate : farFuture } });
  }

  return NextResponse.json({ created });
}
