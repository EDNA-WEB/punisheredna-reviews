import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ShopCategoriesAdmin from '@/components/ShopCategoriesAdmin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function ShopCategoriesAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const categories = await prisma.shopCategory.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: true } } }
  });

  return (
    <div className="admin-page">
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrace — Obchod</div>
      <AdminPageHeader title={<>Kategorie</>} />
      <ShopCategoriesAdmin initialCategories={categories} />
    </div>
  );
}
