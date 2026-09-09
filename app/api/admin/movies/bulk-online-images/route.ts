import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdbGetBackdropUrl } from '@/lib/tmdb';
import { logBulkImportBatch, LoggedChange } from '@/lib/bulkImportLog';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { preview } = await req.json().catch(() => ({ preview: false }));

  // Len filmy prepojené s TMDb, čo ešte nemajú vlastný náhľadový obrázok —
  // nedotkne sa filmov, kde už niekto obrázok ručne nastavil.
  const movies = await prisma.movie.findMany({
    where: { approved: true, onlineImage: null, tmdbId: { not: null } },
    select: { id: true, title: true, tmdbId: true, contentType: true }
  });

  if (preview) {
    return NextResponse.json({ count: movies.length, sample: movies.slice(0, 20).map((m) => m.title) });
  }

  const results: { title: string; status: string; detail?: string }[] = [];
  const changes: LoggedChange[] = [];

  for (const movie of movies) {
    try {
      const imageUrl = await tmdbGetBackdropUrl(movie.tmdbId!, movie.contentType === 'Seriál' ? 'tv' : 'movie');
      if (!imageUrl) {
        results.push({ title: movie.title, status: 'BEZ OBRÁZKA', detail: 'Na TMDb sa nenašiel vhodný obrázok' });
        continue;
      }
      await prisma.movie.update({ where: { id: movie.id }, data: { onlineImage: imageUrl } });
      changes.push({
        targetType: 'movie',
        targetId: movie.id,
        movieTitle: movie.title,
        field: 'onlineImage',
        oldValue: null,
        newValue: imageUrl
      });
      results.push({ title: movie.title, status: 'OK' });
    } catch (err: any) {
      results.push({ title: movie.title, status: 'CHYBA', detail: err.message });
    }
  }

  const batchId = await logBulkImportBatch('online-images', changes);
  return NextResponse.json({ results, batchId, checked: movies.length });
}
