import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BulkTmdbImportForm from '@/components/BulkTmdbImportForm';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default async function BulkImportPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Hromadný import z TMDb</>} />
      <BulkTmdbImportForm />
    </div>
  );
}
