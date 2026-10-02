import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ReviewForm from '@/components/ReviewForm';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default async function EditReviewPage(props: { params: Promise<{ id: string }> }) {
  const { params } = { ...props, params: await props.params };
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const review = await prisma.review.findUnique({ where: { id: params.id } });
  if (!review) return notFound();

  const rating = await prisma.rating.findFirst({ where: { movieId: review.movieId, userId: review.authorId, seasonId: null, episodeId: null } });

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Upravit recenzi</>} />
      <ReviewForm initial={{ id: review.id, movieId: review.movieId, body: review.body, rating: rating?.value || 0 }} movieLocked />
    </div>
  );
}
