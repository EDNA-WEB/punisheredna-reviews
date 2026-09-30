import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import SystemBroadcastForm from '@/components/SystemBroadcastForm';
import RegistrationsToggle from '@/components/RegistrationsToggle';
import OnlineFreeForAllToggle from '@/components/OnlineFreeForAllToggle';
import { getOrCreateSystemAccount } from '@/lib/recoveryCode';

export const dynamic = 'force-dynamic';

export default async function AdminSystemPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const system = await getOrCreateSystemAccount();
  const recipientCount = await prisma.user.count({ where: { banned: false, id: { not: system.id } } });
  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' }, select: { registrationsEnabled: true, onlineFreeForAll: true } });

  return (
    <div className="pt-8">
      <AdminTabs />
      <h1 className="font-display font-extrabold text-3xl text-ink mb-6">Systém</h1>

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
