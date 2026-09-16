import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import MembershipAdminPanel from '@/components/MembershipAdminPanel';
import BuyMeACoffeeLinkForm from '@/components/BuyMeACoffeeLinkForm';
import MembershipDirectSetForm from '@/components/MembershipDirectSetForm';
import MembershipOverviewTable from '@/components/MembershipOverviewTable';

export const dynamic = 'force-dynamic';

export default async function AdminMembershipPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const [codes, settings, members] = await Promise.all([
    prisma.membershipCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { usedBy: { select: { name: true } } }
    }),
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
      <h1 className="font-display font-extrabold text-3xl text-ink mb-6">Členstvo — Golden Ticket</h1>

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

        <div className="pt-2 border-t border-line">
          <MembershipAdminPanel
            initialCodes={codes.map((c) => ({
              id: c.id,
              code: c.code,
              type: c.type,
              usedByName: c.usedBy?.name || null,
              usedAt: c.usedAt ? c.usedAt.toISOString() : null,
              createdAt: c.createdAt.toISOString()
            }))}
          />
        </div>
      </div>
    </div>
  );
}
