import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import LegalRequestsAdmin from '@/components/admin/LegalRequestsAdmin';

export const dynamic = 'force-dynamic';

// Evidencia žiadostí orgánov (polícia, súd, štátne zastupiteľstvo).
export default async function LegalRequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') notFound();
  const rows = await prisma.legalRequest.findMany({ orderBy: { receivedAt: 'desc' }, take: 200 });
  return (
    <div className="admin-page">
      <AdminPageHeader
        title={<>Žádosti orgánů</>}
        description={<>Evidence žádostí policie, soudů a dalších orgánů o vydání údajů — co bylo požadováno, na jakém právním základě a co bylo skutečně vydáno.</>}
      />
      <LegalRequestsAdmin initial={rows.map((r) => ({ ...r, receivedAt: r.receivedAt.toISOString(), createdAt: r.createdAt.toISOString() }))} />
    </div>
  );
}
