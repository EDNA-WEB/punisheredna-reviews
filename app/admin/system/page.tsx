import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SystemBroadcastForm from '@/components/SystemBroadcastForm';
import RegistrationsToggle from '@/components/RegistrationsToggle';
import OnlineFreeForAllToggle from '@/components/OnlineFreeForAllToggle';
import { getOrCreateSystemAccount } from '@/lib/recoveryCode';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminSystemPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const system = await getOrCreateSystemAccount();
  const recipientCount = await prisma.user.count({ where: { banned: false, id: { not: system.id } } });
  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' }, select: { registrationsEnabled: true, onlineFreeForAll: true } });

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Systém</>} />

      <div className="mb-4">
        <RegistrationsToggle initialEnabled={settings?.registrationsEnabled ?? true} />
      </div>

      <div className="mb-8">
        <OnlineFreeForAllToggle initialEnabled={settings?.onlineFreeForAll ?? false} />
      </div>

      <p className="text-muted mb-8 max-w-xl">
        Odešli hromadnou zprávu (novinku, upozornění, reklamu) do schránky úplně všem uživatelům najednou. Odesílatelem bude technický účet "Systém", ne tvůj osobní účet.
      </p>
      <SystemBroadcastForm recipientCount={recipientCount} />
    </div>
  );
}
