import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ShopProductForm from '@/components/ShopProductForm';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function NewShopProductPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const categories = await prisma.shopCategory.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } });

  return (
    <div className="admin-page">
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrace — Obchod</div>
      <AdminPageHeader title={<>Nový produkt</>} />
      {categories.length === 0 ? (
        <p className="text-sm text-muted">Nejdřív vytvoř alespoň jednu kategorii v Administrace → Obchod → Kategorie.</p>
      ) : (
        <ShopProductForm categories={categories} />
      )}
    </div>
  );
}
