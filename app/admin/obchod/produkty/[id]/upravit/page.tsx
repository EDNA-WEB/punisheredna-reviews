import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import ShopProductForm from '@/components/ShopProductForm';

export const dynamic = 'force-dynamic';

export default async function EditShopProductPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const [categories, product] = await Promise.all([
    prisma.shopCategory.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    prisma.shopProduct.findUnique({ where: { id: params.id }, include: { variants: { orderBy: { order: 'asc' } } } })
  ]);

  if (!product) notFound();

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia — Obchod</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Upraviť produkt</h1>
      <ShopProductForm categories={categories} initial={product} />
    </div>
  );
}
