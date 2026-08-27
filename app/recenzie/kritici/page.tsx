import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ReviewPreviewCard from '@/components/ReviewPreviewCard';
import { getVerifiedCriticIds } from '@/lib/criticStatus';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

export default async function CriticReviewsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const verifiedCriticIds = Array.from(await getVerifiedCriticIds());

  const [reviews, total] = verifiedCriticIds.length
    ? await Promise.all([
        prisma.review.findMany({
          where: { authorId: { in: verifiedCriticIds }, seasonId: null, episodeId: null },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          include: {
            movie: { include: { ratings: { where: { seasonId: null, episodeId: null } } } },
            author: { select: { id: true, name: true, avatar: true, membershipUntil: true } }
          }
        }),
        prisma.review.count({ where: { authorId: { in: verifiedCriticIds }, seasonId: null, episodeId: null } })
      ])
    : [[], 0];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="pt-8">
      <Link href="/" className="text-sm text-muted hover:text-accent inline-block mb-5">← Späť na hlavnú stránku</Link>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Recenzie overených kritikov</h1>
      <p className="text-muted mb-8">Recenzie od používateľov s odznakom Overený kritik.</p>

      {reviews.length === 0 ? (
        <div className="border border-line rounded-xl p-12 text-center text-muted bg-surface">
          Zatiaľ žiadne recenzie od overených kritikov.
        </div>
      ) : (
        <>
          <div className="flex sm:grid sm:grid-cols-4 gap-4 mb-8 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-1">
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
                  showCriticBadge
                />
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              {page > 1 && (
                <Link href={`/recenzie/kritici?page=${page - 1}`} className="text-sm font-semibold px-4 py-2 rounded-full border border-line hover:border-accent hover:text-accent">
                  ← Novšie
                </Link>
              )}
              <span className="text-sm text-muted">Strana {page} / {totalPages}</span>
              {page < totalPages && (
                <Link href={`/recenzie/kritici?page=${page + 1}`} className="text-sm font-semibold px-4 py-2 rounded-full border border-line hover:border-accent hover:text-accent">
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
