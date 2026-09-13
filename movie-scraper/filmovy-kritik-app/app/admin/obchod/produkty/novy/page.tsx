import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import ShopProductForm from '@/components/ShopProductForm';

export const dynamic = 'force-dynamic';

export default async function NewShopProductPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const categories = await prisma.shopCategory.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia — Obchod</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Nový produkt</h1>
      {categories.length === 0 ? (
        <p className="text-sm text-muted">Najprv vytvor aspoň jednu kategóriu v Administrácia → Obchod → Kategórie.</p>
      ) : (
        <ShopProductForm categories={categories} />
      )}
    </div>
  );
}
