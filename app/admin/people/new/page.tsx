import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PersonFormWithTmdbImport from '@/components/PersonFormWithTmdbImport';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default async function NewPersonPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Přidat osobu</>} />
      <PersonFormWithTmdbImport />
    </div>
  );
}
