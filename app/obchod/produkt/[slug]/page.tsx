import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { IconHeartOutline } from '@/components/Icons';
import ShopVariantSelector from '@/components/ShopVariantSelector';

export const dynamic = 'force-dynamic';

export default async function ShopProductPage({ params }: { params: { slug: string } }) {
  const product = await prisma.shopProduct.findUnique({
    where: { slug: params.slug, approved: true },
    include: { variants: { orderBy: { order: 'asc' } }, category: { select: { name: true, slug: true } } }
  });

  if (!product) notFound();

  return (
    <div className="pt-8 pb-16 max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="font-display font-extrabold text-2xl text-ink">{product.title}</h1>
        <button
          type="button"
          aria-label="Pridať do obľúbených"
          className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-muted hover:border-accent hover:text-accent transition-colors flex-none"
        >
          <IconHeartOutline className="w-4 h-4" />
        </button>
      </div>
      {product.rating && (
        <div className="flex items-center gap-2 mb-6 text-sm">
          <span className="text-amber-500">{'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}</span>
          <span className="font-semibold text-ink">{product.rating.toFixed(1)}</span>
          <span className="text-muted">{product.reviewCount} recenzií</span>
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_1.3fr] gap-8">
        <div>
          <div className="relative rounded-xl overflow-hidden bg-surface aspect-[3/4] border border-line">
            {product.image && (
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${product.image}')` }} />
            )}
          </div>
        </div>

        <div>
          <div className="border border-line rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {product.platform && (
                <div>
                  <div className="text-xs text-muted mb-0.5">Platforma</div>
                  <div className="font-semibold text-ink">{product.platform}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted mb-0.5">Typ</div>
                <div className="font-semibold text-ink">{product.type}</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted mb-1">Región</div>
              <div className="border border-line rounded-lg px-3 py-2 text-sm font-semibold text-ink">{product.region}</div>
            </div>

            <ShopVariantSelector variants={product.variants} />

            {product.regionRestriction && (
              <p className="text-xs text-amber-600">⚠ {product.regionRestriction}</p>
            )}
            {product.activationInfo && (
              <p className="text-xs text-muted">ℹ {product.activationInfo}</p>
            )}
          </div>
        </div>
      </div>

      {product.description && (
        <div className="mt-10 max-w-2xl">
          <h2 className="font-display font-bold text-lg text-ink mb-2">Popis</h2>
          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{product.description}</p>
        </div>
      )}
    </div>
  );
}
