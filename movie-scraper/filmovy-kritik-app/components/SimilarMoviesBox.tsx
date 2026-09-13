import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { tmdbGetSimilarMovies } from '@/lib/tmdb';

export default async function SimilarMoviesBox({ tmdbId, mediaType }: { tmdbId: number; mediaType: 'movie' | 'tv' }) {
  const items = (await tmdbGetSimilarMovies(tmdbId, mediaType)).slice(0, 6);
  if (items.length === 0) return null;

  const tmdbIds = items.map((item: { tmdbId: number }) => item.tmdbId);
  const ourMovies = await prisma.movie.findMany({
    where: { tmdbId: { in: tmdbIds }, approved: true },
    select: { tmdbId: true, slug: true }
  });
  const slugByTmdbId = new Map(ourMovies.map((m) => [m.tmdbId, m.slug]));

  return (
    <div className="border border-line rounded-xl overflow-hidden mb-6">
      <div className="bg-surface px-4 py-2.5">
        <h2 className="font-display font-bold text-sm text-ink">Podobné tituly</h2>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {items.map((item: { tmdbId: number; title: string; year: string; poster: string | null }) => {
            const ourSlug = slugByTmdbId.get(item.tmdbId);
            const content = (
              <>
                <div
                  className="aspect-[2/3] rounded-lg overflow-hidden border border-line bg-surface bg-cover bg-center shadow-sm group-hover:shadow-md transition-shadow"
                  style={item.poster ? { backgroundImage: `url('${item.poster}')` } : undefined}
                />
                <div className={`text-xs mt-1.5 leading-snug line-clamp-2 ${ourSlug ? 'text-accent group-hover:underline' : 'text-ink'}`}>
                  {item.title}
                </div>
                {item.year && <div className="text-[11px] text-muted">{item.year}</div>}
              </>
            );
            return ourSlug ? (
              <Link key={item.tmdbId} href={`/movie/${ourSlug}`} className="block group">
                {content}
              </Link>
            ) : (
              <div key={item.tmdbId} className="group">
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
