import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ReviewForm from '@/components/ReviewForm';

export default async function EditReviewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const review = await prisma.review.findUnique({ where: { id: params.id } });
  if (!review) return notFound();

  const rating = await prisma.rating.findFirst({ where: { movieId: review.movieId, userId: review.authorId, seasonId: null, episodeId: null } });

  return (
    <div className="pt-8">
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Upraviť recenziu</h1>
      <ReviewForm initial={{ id: review.id, movieId: review.movieId, body: review.body, rating: rating?.value || 0 }} movieLocked />
    </div>
  );
}
