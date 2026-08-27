import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ReviewForm from '@/components/ReviewForm';

export default async function WriteReviewPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/login`);

  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
  if (!user || user.banned) redirect(`/movie/${params.slug}`);

  const movie = await prisma.movie.findUnique({ where: { slug: params.slug } });
  if (!movie) return notFound();

  const existing = await prisma.review.findFirst({
    where: { movieId: movie.id, authorId: user.id, seasonId: null, episodeId: null }
  });
  if (existing) redirect(`/movie/${params.slug}/upravit/${existing.id}`);

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">Napísať recenziu</h1>
      <p className="text-muted mb-8">{movie.title}</p>
      <ReviewForm initial={{ movieId: movie.id }} movieLocked redirectTo={`/movie/${params.slug}`} />
    </div>
  );
}
