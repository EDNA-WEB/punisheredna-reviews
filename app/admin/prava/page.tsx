import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import RightsAdminList from '@/components/RightsAdminList';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminRightsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const users = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' }, banned: false, deleted: false },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, isEditor: true }
  });

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Práva</>} />
      <p className="text-muted mb-6 max-w-xl">
        Tady uděluješ omezená admin práva vybraným uživatelům — momentálně je dostupné jen právo "Redaktor". V budoucnu tu mohou přibýt další.
      </p>
      <RightsAdminList initialUsers={users} />
    </div>
  );
}
