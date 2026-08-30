import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import CountdownBadge from './CountdownBadge';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export default async function PremieresList() {
  const t = (await getDictionary(await getUserLanguage()));
  const premieres = await prisma.moviePremiereDate.findMany({
    where: { releaseDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    orderBy: { releaseDate: 'asc' },
    take: 4,
    include: { movie: { select: { title: true, slug: true, year: true, genres: true } } }
  });

  if (premieres.length === 0) return null;

  return (
    <div className="border border-line rounded-xl p-4 bg-card h-full">
      <h3 className="font-display font-bold text-sm text-ink mb-3">{t['home.v_kinach_coskoro'] || 'V kinách čoskoro'}</h3>
      <div className="space-y-3">
        {premieres.map((p) => (
          <Link key={p.id} href={`/movie/${p.movie.slug}`} className="flex items-center gap-3 hover:bg-surface -mx-1 px-1 py-0.5 rounded-lg transition-colors">
            <CountdownBadge date={p.releaseDate} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink leading-snug">{p.movie.title}</div>
              <div className="text-[11px] text-muted">
                {[p.movie.year, p.movie.genres].filter(Boolean).join(' · ')}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
