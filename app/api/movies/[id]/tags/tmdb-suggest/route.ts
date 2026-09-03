import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { freeTranslateMany } from '@/lib/freeTranslate';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: params.id }, select: { tmdbId: true, contentType: true } });
  if (!movie?.tmdbId) {
    return NextResponse.json({ error: 'Tento film/seriál nie je prepojený s TMDb.' }, { status: 400 });
  }

  const mediaType = movie.contentType === 'Seriál' ? 'tv' : 'movie';
  const url = `https://api.themoviedb.org/3/${mediaType}/${movie.tmdbId}/keywords`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`, accept: 'application/json' }
  });
  if (!res.ok) return NextResponse.json({ error: 'Načítanie kľúčových slov z TMDb zlyhalo.' }, { status: 500 });

  const data = await res.json();
  const keywordList = mediaType === 'movie' ? data.keywords : data.results;
  const englishTags: string[] = (keywordList || []).slice(0, 10).map((k: any) => k.name);

  if (englishTags.length === 0) {
    return NextResponse.json({ tags: '' });
  }

  const translated = await freeTranslateMany(englishTags, 'cs');
  return NextResponse.json({ tags: translated.join(', ') });
}
