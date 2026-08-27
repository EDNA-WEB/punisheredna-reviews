import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ReviewForm from '@/components/ReviewForm';

export default async function EditReviewPage({ params }: { params: { slug: string; reviewId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const review = await prisma.review.findUnique({ where: { id: params.reviewId }, include: { movie: true } });
  if (!review) return notFound();

  const isAdmin = (session.user as any).role === 'ADMIN';
  const isAuthor = review.authorId === (session.user as any).id;
  if (!isAdmin && !isAuthor) redirect(`/movie/${params.slug}`);

  const rating = await prisma.rating.findFirst({
    where: { movieId: review.movieId, userId: review.authorId, seasonId: review.seasonId, episodeId: review.episodeId }
  });

  let redirectTo = `/movie/${params.slug}`;
  if (review.seasonId && review.episodeId) {
    const [season, episode] = await Promise.all([
      prisma.season.findUnique({ where: { id: review.seasonId }, select: { number: true } }),
      prisma.episode.findUnique({ where: { id: review.episodeId }, select: { number: true } })
    ]);
    if (season && episode) redirectTo = `/movie/${params.slug}/sezona/${season.number}/epizoda/${episode.number}`;
  } else if (review.seasonId) {
    const season = await prisma.season.findUnique({ where: { id: review.seasonId }, select: { number: true } });
    if (season) redirectTo = `/movie/${params.slug}/sezona/${season.number}`;
  }

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">Upraviť recenziu</h1>
      <p className="text-muted mb-8">{review.movie.title}</p>
      <ReviewForm
        initial={{ id: review.id, movieId: review.movieId, body: review.body, rating: rating?.value || 0 }}
        movieLocked
        redirectTo={redirectTo}
      />
    </div>
  );
}
