import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminTabs from '@/components/AdminTabs';

export const dynamic = 'force-dynamic';

export default async function ShopProductsAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const products = await prisma.shopProduct.findMany({
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { name: true } }, variants: { select: { price: true } } }
  });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia — Obchod</div>
          <h1 className="font-display font-extrabold text-3xl text-ink">Produkty</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/obchod/kategorie" className="border border-line text-ink px-5 py-2.5 rounded-full text-sm font-semibold hover:border-accent hover:text-accent">
            Kategórie
          </Link>
          <Link href="/admin/obchod/produkty/novy" className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark">
            + Pridať produkt
          </Link>
        </div>
      </div>

      <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
        {products.map((p) => (
          <Link key={p.id} href={`/admin/obchod/produkty/${p.id}/upravit`} className="flex items-center gap-3 p-3 hover:bg-surface">
            <div className="w-10 h-10 rounded bg-surface bg-cover bg-center flex-none" style={p.image ? { backgroundImage: `url('${p.image}')` } : undefined} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink truncate">{p.title}</div>
              <div className="text-xs text-muted">{p.category.name} · {p.variants.length} variantov{!p.approved ? ' · Skryté' : ''}</div>
            </div>
            {p.variants.length > 0 && (
              <div className="text-sm font-semibold text-ink flex-none">
                od {Math.min(...p.variants.map((v) => v.price)).toFixed(2)} USD
              </div>
            )}
          </Link>
        ))}
        {products.length === 0 && <p className="text-sm text-muted p-4">Zatiaľ žiadne produkty.</p>}
      </div>
    </div>
  );
}
