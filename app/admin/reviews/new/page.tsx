import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ReviewForm from '@/components/ReviewForm';

export default async function NewReviewPage(props: { searchParams: Promise<{ movieId?: string }> }) {
  const { searchParams } = { ...props, searchParams: await props.searchParams };
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Nová recenzia</h1>
      <ReviewForm initial={searchParams.movieId ? { movieId: searchParams.movieId } : undefined} />
    </div>
  );
}
