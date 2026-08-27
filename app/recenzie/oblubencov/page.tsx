import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ReviewPreviewCard from '@/components/ReviewPreviewCard';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

export default async function FavoriteReviewsPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const viewerId = (session.user as any).id;
  const page = Math.max(1, Number(searchParams?.page) || 1);

  const following = await prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
  const followingIds = following.map((f) => f.followingId);

  const [reviews, total] = followingIds.length
    ? await Promise.all([
        prisma.review.findMany({
          where: { authorId: { in: followingIds }, seasonId: null, episodeId: null },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          include: {
            movie: { include: { ratings: { where: { seasonId: null, episodeId: null } } } },
            author: { select: { id: true, name: true, avatar: true } }
          }
        }),
        prisma.review.count({ where: { authorId: { in: followingIds }, seasonId: null, episodeId: null } })
      ])
    : [[], 0];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="pt-8">
      <Link href="/" className="text-sm text-muted hover:text-accent inline-block mb-5">← Späť na hlavnú stránku</Link>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Recenzie obľúbených</h1>
      <p className="text-muted mb-8">Všetky recenzie od ľudí, ktorých sleduješ.</p>

      {reviews.length === 0 ? (
        <div className="border border-line rounded-xl p-12 text-center text-muted bg-surface">
          {followingIds.length === 0
            ? 'Zatiaľ nikoho nemáš v obľúbených.'
            : 'Tvoji obľúbení ešte nenapísali žiadnu recenziu.'}
        </div>
      ) : (
        <>
          <div className="flex sm:grid sm:grid-cols-4 gap-4 mb-8 overflow-x-auto sm:overflow-visible snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
            {reviews.map((r: any) => {
              const myRating = r.movie.ratings.find((rt: any) => rt.userId === r.authorId);
              return (
                <div key={r.id} className="flex-none w-[78%] sm:w-auto snap-start">
                <ReviewPreviewCard
                  slug={r.movie.slug}
                  body={r.body}
                  author={r.author}
                  rating={myRating?.value || 0}
                  movieTitle={r.movie.title}
                  movieYear={r.movie.year}
                  moviePoster={r.movie.poster}
                />
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              {page > 1 && (
                <Link href={`/recenzie/oblubencov?page=${page - 1}`} className="text-sm font-semibold px-4 py-2 rounded-full border border-line hover:border-accent hover:text-accent">
                  ← Novšie
                </Link>
              )}
              <span className="text-sm text-muted">Strana {page} / {totalPages}</span>
              {page < totalPages && (
                <Link href={`/recenzie/oblubencov?page=${page + 1}`} className="text-sm font-semibold px-4 py-2 rounded-full border border-line hover:border-accent hover:text-accent">
                  Staršie →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
