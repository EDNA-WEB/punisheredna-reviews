import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import RightsAdminList from '@/components/RightsAdminList';

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
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Práva</h1>
      <p className="text-muted mb-6 max-w-xl">
        Tu udeľuješ obmedzené admin práva vybraným používateľom — momentálne je dostupné len právo "Redaktor".
        V budúcnosti tu môžu pribudnúť ďalšie.
      </p>
      <RightsAdminList initialUsers={users} />
    </div>
  );
}
