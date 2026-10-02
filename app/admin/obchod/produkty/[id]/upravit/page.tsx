import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ShopProductForm from '@/components/ShopProductForm';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function EditShopProductPage(props: { params: Promise<{ id: string }> }) {
  const { params } = { ...props, params: await props.params };
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const [categories, product] = await Promise.all([
    prisma.shopCategory.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    prisma.shopProduct.findUnique({ where: { id: params.id }, include: { variants: { orderBy: { order: 'asc' } } } })
  ]);

  if (!product) notFound();

  return (
    <div className="admin-page">
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrace — Obchod</div>
      <AdminPageHeader title={<>Upravit produkt</>} />
      <ShopProductForm categories={categories} initial={product} />
    </div>
  );
}
