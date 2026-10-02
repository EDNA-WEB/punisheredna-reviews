import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ReviewForm from '@/components/ReviewForm';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default async function NewReviewPage(props: { searchParams: Promise<{ movieId?: string }> }) {
  const { searchParams } = { ...props, searchParams: await props.searchParams };
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Nová recenze</>} />
      <ReviewForm initial={searchParams.movieId ? { movieId: searchParams.movieId } : undefined} />
    </div>
  );
}
