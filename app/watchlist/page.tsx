import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import WatchlistButton from '@/components/WatchlistButton';
import EmptyState from '@/components/EmptyState';
import { IconBookmark } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const viewerId = (session.user as any).id;

  const items = await prisma.watchlistItem.findMany({
    where: { userId: viewerId },
    orderBy: { createdAt: 'desc' },
    include: { movie: { select: { id: true, title: true, slug: true, poster: true, year: true, genres: true } } }
  });

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Chcem vidieť</h1>
      <p className="text-muted mb-8">Filmy, ktoré si si odložil na neskôr.</p>

      {items.length === 0 ? (
        <EmptyState
          icon={<IconBookmark className="w-5 h-5" />}
          title="Zatiaľ nič v zozname"
          description="Pridaj si film tlačidlom „Chcem vidieť“ na jeho stránke."
          actionLabel="Prezrieť filmy"
          actionHref="/recenzie"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-9">
          {items.map(({ movie }) => (
            <div key={movie.id}>
              <Link href={`/movie/${movie.slug}`} className="block group">
                <div className="relative rounded overflow-hidden bg-surface aspect-[2/3] mb-2.5">
                  {movie.poster && <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${movie.poster}')` }} />}
                </div>
                <h4 className="font-display font-bold text-[15px] leading-snug text-ink group-hover:text-accent transition-colors">
                  {movie.title}
                </h4>
                {movie.year && <div className="text-xs text-muted mt-0.5">{movie.year}</div>}
              </Link>
              <div className="mt-2">
                <WatchlistButton movieId={movie.id} initialInWatchlist />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
