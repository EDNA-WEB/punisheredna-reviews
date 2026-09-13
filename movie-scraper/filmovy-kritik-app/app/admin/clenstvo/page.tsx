import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import MembershipAdminPanel from '@/components/MembershipAdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminMembershipPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const codes = await prisma.membershipCode.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { usedBy: { select: { name: true } } }
  });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-6">Členstvo — Golden Ticket</h1>
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
  );
}
