import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { freeTranslateMany } from '@/lib/freeTranslate';
import { logBulkImportBatch, LoggedChange } from '@/lib/bulkImportLog';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { preview } = await req.json().catch(() => ({ preview: false }));

  // Len filmy prepojené s TMDb, čo ešte nemajú žiadne tagy — nedotkne sa
  // filmov, kde už niekto tagy ručne doplnil alebo upravil.
  const movies = await prisma.movie.findMany({
    where: { approved: true, tmdbId: { not: null }, OR: [{ tags: null }, { tags: '' }] },
    select: { id: true, title: true, tmdbId: true, contentType: true }
  });

  if (preview) {
    return NextResponse.json({ count: movies.length, sample: movies.slice(0, 20).map((m) => m.title) });
  }

  const results: { id: string; title: string; status: string; detail?: string }[] = [];
  const changes: LoggedChange[] = [];

  for (const movie of movies) {
    try {
      const mediaType = movie.contentType === 'Seriál' ? 'tv' : 'movie';
      const url = `https://api.themoviedb.org/3/${mediaType}/${movie.tmdbId}/keywords`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`, accept: 'application/json' }
      });
      if (!res.ok) {
        results.push({ id: movie.id, title: movie.title, status: 'CHYBA', detail: 'Načítanie kľúčových slov z TMDb zlyhalo' });
        continue;
      }

      const data = await res.json();
      const keywordList = mediaType === 'movie' ? data.keywords : data.results;
      const englishTags: string[] = (keywordList || []).slice(0, 10).map((k: any) => k.name);

      if (englishTags.length === 0) {
        results.push({ id: movie.id, title: movie.title, status: 'BEZ TAGOV', detail: 'TMDb pre tento film/seriál nemá žiadne kľúčové slová' });
        continue;
      }

      const translated = await freeTranslateMany(englishTags, 'cs');
      const tagsValue = translated.join(', ');

      await prisma.movie.update({ where: { id: movie.id }, data: { tags: tagsValue } });
      changes.push({
        targetType: 'movie',
        targetId: movie.id,
        movieTitle: movie.title,
        field: 'tags',
        oldValue: null,
        newValue: tagsValue
      });

      results.push({ id: movie.id, title: movie.title, status: 'OK', detail: tagsValue });
    } catch (err: any) {
      results.push({ id: movie.id, title: movie.title, status: 'CHYBA', detail: err.message || 'neznáma chyba' });
    }
  }

  const batchId = await logBulkImportBatch('tags-from-tmdb', changes);
  return NextResponse.json({ results, batchId, checked: movies.length });
}
