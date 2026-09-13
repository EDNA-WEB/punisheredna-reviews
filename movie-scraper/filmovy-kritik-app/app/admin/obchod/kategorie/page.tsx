import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import ShopCategoriesAdmin from '@/components/ShopCategoriesAdmin';

export const dynamic = 'force-dynamic';

export default async function ShopCategoriesAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const categories = await prisma.shopCategory.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: true } } }
  });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia — Obchod</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Kategórie</h1>
      <ShopCategoriesAdmin initialCategories={categories} />
    </div>
  );
}
