import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetWatchProviders } from '@/lib/tmdb';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: params.id }, select: { tmdbId: true, contentType: true } });
  if (!movie?.tmdbId) {
    return NextResponse.json({ error: 'Tento film/seriál nie je prepojený s TMDb.' }, { status: 400 });
  }

  const { providerNames, link } = await tmdbGetWatchProviders(movie.tmdbId, movie.contentType === 'Seriál' ? 'tv' : 'movie');
  if (providerNames.length === 0) {
    return NextResponse.json({ error: 'Na TMDb sa nenašla žiadna dostupnosť pre toto CZ/US.' }, { status: 404 });
  }

  // Priradíme podľa názvu k tomu, čo už máš v katalógu služieb (nepresné/čiastočné
  // zhody tiež berieme do úvahy — napr. "Netflix" v TMDb aj u nás).
  const ourServices = await prisma.streamingService.findMany({ select: { id: true, name: true } });
  const matchedServiceIds = ourServices
    .filter((s) => providerNames.some((p: string) => p.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(p.toLowerCase())))
    .map((s) => s.id);

  return NextResponse.json({ matchedServiceIds, link, providerNames });
}
