import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import CountdownBadge from './CountdownBadge';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export default async function PremieresList() {
  const t = (await getDictionary(await getUserLanguage()));
  const premieres = await prisma.moviePremiereDate.findMany({
    where: { releaseDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, type: { not: 'VOD' } },
    orderBy: { releaseDate: 'asc' },
    take: 8,
    include: { movie: { select: { title: true, slug: true, poster: true, genres: true } } }
  });

  if (premieres.length === 0) return null;

  return (
    <div className="border border-line rounded-xl overflow-hidden bg-card h-full">
      <div className="px-4 py-3 flex items-center gap-2 bg-gradient-to-r from-night to-night/90">
        <span className="relative flex h-2 w-2 flex-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
        </span>
        <h3 className="font-display font-bold text-sm text-white">{t['home.v_kinach_coskoro'] || 'V kinách čoskoro'}</h3>
      </div>

      <div className="flex gap-3 overflow-x-auto p-4 pt-5 snap-x">
        {premieres.map((p) => (
          <Link
            key={p.id}
            href={`/movie/${p.movie.slug}`}
            className="group relative flex-none w-28 snap-start"
          >
            <div className="relative rounded-xl overflow-hidden bg-surface aspect-[2/3] shadow-sm border border-line">
              {p.movie.poster && (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.06]"
                  style={{ backgroundImage: `url('${p.movie.poster}')` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/10 to-transparent" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <CountdownBadge date={p.releaseDate} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <div className="text-[11px] font-semibold text-white leading-snug line-clamp-2">{p.movie.title}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
