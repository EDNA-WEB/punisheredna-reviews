import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import EmailDomainsAdmin from '@/components/admin/EmailDomainsAdmin';

export const dynamic = 'force-dynamic';

export default async function BlockedEmailsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');
  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Blokované e-maily</>} compact />
      <EmailDomainsAdmin />
    </div>
  );
}
