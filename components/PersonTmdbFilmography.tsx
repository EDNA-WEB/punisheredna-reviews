import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { tmdbGetPersonFilmography } from '@/lib/tmdb';

type FilmItem = { tmdbId: number; title: string; year: string; character?: string | null; job?: string | null; poster: string | null };

function groupByYear(items: FilmItem[]) {
  const groups = new Map<string, FilmItem[]>();
  for (const item of items) {
    const key = item.year || 'Neznámy rok';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

export default async function PersonTmdbFilmography({ tmdbId, role }: { tmdbId: number; role: 'ACTOR' | 'CREATOR' }) {
  const { asActor, asCrew } = await tmdbGetPersonFilmography(tmdbId);
  const list: FilmItem[] = role === 'ACTOR' ? asActor : (asCrew.length > 0 ? asCrew : asActor);

  if (list.length === 0) return null;

  // Ak niektorý z týchto titulov už máme na našom webe (prepojené cez TMDb ID),
  // prekliknutie pôjde priamo na jeho profil u nás, nie nikam von.
  const tmdbIds = list.map((item) => item.tmdbId).filter(Boolean);
  const ourMovies = await prisma.movie.findMany({
    where: { tmdbId: { in: tmdbIds }, approved: true },
    select: { tmdbId: true, slug: true }
  });
  const slugByTmdbId = new Map(ourMovies.map((m) => [m.tmdbId, m.slug]));

  const grouped = groupByYear(list);

  return (
    <div className="border border-line rounded-xl overflow-hidden mb-6">
      <div className="bg-surface px-4 py-2.5">
        <h3 className="font-display font-bold text-sm text-ink">Filmografia</h3>
      </div>
      <div className="p-4 space-y-5 max-h-[480px] overflow-y-auto">
        {grouped.map(([year, items]) => (
          <div key={year}>
            <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">{year}</div>
            <div className="space-y-2">
              {items.map((item, i) => {
                const ourSlug = slugByTmdbId.get(item.tmdbId);
                const content = (
                  <div className="flex items-center gap-3 group">
                    <div
                      className="w-10 h-14 rounded-md bg-surface bg-cover bg-center border border-line flex-none"
                      style={item.poster ? { backgroundImage: `url('${item.poster}')` } : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-semibold leading-snug truncate ${ourSlug ? 'text-accent group-hover:underline' : 'text-ink'}`}>
                        {item.title}
                      </div>
                      {(item.character || item.job) && (
                        <div className="text-xs text-muted truncate">{item.character || item.job}</div>
                      )}
                    </div>
                  </div>
                );
                return ourSlug ? (
                  <Link key={`${item.tmdbId}-${i}`} href={`/movie/${ourSlug}`} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={`${item.tmdbId}-${i}`}>{content}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
