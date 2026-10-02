import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MovieExportForm from '@/components/MovieExportForm';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default async function MovieExportPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Export seznamu filmů a seriálů</>} />
      <MovieExportForm />
    </div>
  );
}
