import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { IconHeartOutline } from '@/components/Icons';
import ShopSortSelect from '@/components/ShopSortSelect';
import { formatPrice } from '@/lib/formatCurrency';

export const dynamic = 'force-dynamic';

export default async function ShopPage({ searchParams }: { searchParams: { kategoria?: string; from?: string; to?: string; sort?: string } }) {
  const categories = await prisma.shopCategory.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: { where: { approved: true } } } } }
  });

  const activeCategory = searchParams.kategoria ? categories.find((c) => c.slug === searchParams.kategoria) : null;

  const priceFrom = searchParams.from ? Number(searchParams.from) : undefined;
  const priceTo = searchParams.to ? Number(searchParams.to) : undefined;

  const products = await prisma.shopProduct.findMany({
    where: {
      approved: true,
      ...(activeCategory ? { categoryId: activeCategory.id } : {}),
      ...(priceFrom !== undefined || priceTo !== undefined
        ? { variants: { some: { price: { gte: priceFrom ?? 0, lte: priceTo ?? 999999 } } } }
        : {})
    },
    include: { variants: { orderBy: { price: 'asc' }, take: 1 }, category: { select: { name: true } } },
    orderBy: searchParams.sort === 'najlacnejsie' ? undefined : { createdAt: 'desc' }
  });

  const sorted =
    searchParams.sort === 'najlacnejsie'
      ? [...products].sort((a, b) => (a.variants[0]?.price ?? 0) - (b.variants[0]?.price ?? 0))
      : searchParams.sort === 'najdrahsie'
        ? [...products].sort((a, b) => (b.variants[0]?.price ?? 0) - (a.variants[0]?.price ?? 0))
        : products;

  const totalCount = categories.reduce((sum, c) => sum + c._count.products, 0);

  return (
    <div className="pt-8 pb-16">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">Obchod</h1>
      <p className="text-sm text-muted mb-8">
        {activeCategory ? activeCategory.name : 'Všetky produkty'} <span className="text-line">·</span> {sorted.length} položiek
      </p>

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        <aside>
          <div className="border border-line rounded-xl p-4 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted mb-3">Kategórie</h2>
            <div className="space-y-0.5">
              <Link
                href="/obchod"
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${!activeCategory ? 'bg-accent text-white font-semibold' : 'text-ink hover:bg-surface'}`}
              >
                <span>Všetko</span>
                <span className={`text-xs ${activeCategory ? 'text-muted' : 'opacity-90'}`}>{totalCount}</span>
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/obchod?kategoria=${c.slug}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${activeCategory?.id === c.id ? 'bg-accent text-white font-semibold' : 'text-ink hover:bg-surface'}`}
                >
                  <span>{c.name}</span>
                  <span className={`text-xs ${activeCategory?.id === c.id ? 'opacity-90' : 'text-muted'}`}>{c._count.products}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="border border-line rounded-xl p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted mb-3">Cena (€)</h2>
            <form className="flex items-center gap-2">
              {activeCategory && <input type="hidden" name="kategoria" value={activeCategory.slug} />}
              <input name="from" defaultValue={searchParams.from} placeholder="Od" className="field-input-sm w-full" type="number" />
              <span className="text-muted flex-none">–</span>
              <input name="to" defaultValue={searchParams.to} placeholder="Do" className="field-input-sm w-full" type="number" />
              <button type="submit" className="text-xs font-semibold text-accent hover:underline flex-none">OK</button>
            </form>
          </div>
        </aside>

        <div>
          <div className="flex justify-end mb-4">
            <ShopSortSelect currentSort={searchParams.sort || 'najnovsie'} categorySlug={activeCategory?.slug} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {sorted.map((p) => {
              const cheapest = p.variants[0];
              return (
                <Link
                  key={p.id}
                  href={`/obchod/produkt/${p.slug}`}
                  className="group border border-line rounded-xl p-4 flex gap-4 hover:border-accent hover:shadow-md transition-all bg-card"
                >
                  <div className="relative w-20 h-28 rounded-lg overflow-hidden bg-surface flex-none">
                    {p.image && (
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                        style={{ backgroundImage: `url('${p.image}')` }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[10px] font-semibold text-accent uppercase tracking-wide mb-1">{p.category.name}</span>
                    <div className="text-sm font-semibold text-ink line-clamp-2 mb-1.5 group-hover:text-accent transition-colors">{p.title}</div>
                    <div className="text-xs text-muted mb-1">
                      Región: <span className="text-ink font-medium">{p.region}</span>
                    </div>
                    {p.regionRestriction && <div className="text-[11px] text-amber-600 mb-1">⚠ {p.regionRestriction}</div>}
                    <div className="mt-auto flex items-center justify-between pt-1">
                      {cheapest && (
                        <div>
                          <span className="text-[10px] text-muted">od </span>
                          <span className="text-base font-bold text-ink">{formatPrice(cheapest.price, cheapest.currency)}</span>
                        </div>
                      )}
                      <IconHeartOutline className="w-4 h-4 text-muted hover:text-accent transition-colors" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {sorted.length === 0 && (
            <div className="border border-line rounded-xl p-10 text-center">
              <p className="text-sm text-muted">V tejto kategórii zatiaľ nie sú žiadne produkty.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
