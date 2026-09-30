import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import BuyMeACoffeeLinkForm from '@/components/BuyMeACoffeeLinkForm';
import MembershipDirectSetForm from '@/components/MembershipDirectSetForm';
import MembershipOverviewTable from '@/components/MembershipOverviewTable';

export const dynamic = 'force-dynamic';

export default async function AdminMembershipPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const [settings, members] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 'singleton' }, select: { buyMeACoffeeUrl: true } }),
    prisma.user.findMany({
      where: { membershipUntil: { not: null } },
      orderBy: { membershipUntil: 'desc' },
      select: { id: true, name: true, membershipUntil: true }
    })
  ]);

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Členství — Golden Ticket</h1>
      <p className="text-muted mb-6">
        Členství ověřuješ a nastavuješ ručně — po přijetí platby (např. přes BuyMeACoffee) porovnáš jméno plátce s přezdívkou na webu a nastavíš mu členství přímo níže.
      </p>

      <div className="max-w-2xl space-y-6">
        <BuyMeACoffeeLinkForm initial={settings?.buyMeACoffeeUrl || null} />

        <MembershipDirectSetForm />

        <MembershipOverviewTable
          initialMembers={members.map((m) => ({
            id: m.id,
            name: m.name,
            membershipUntil: m.membershipUntil!.toISOString()
          }))}
        />
      </div>
    </div>
  );
}
