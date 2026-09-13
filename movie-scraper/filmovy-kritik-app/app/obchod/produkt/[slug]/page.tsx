import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { IconChevronRight } from '@/components/Icons';
import ShopVariantSelector from '@/components/ShopVariantSelector';
import ShopReviewsSection from '@/components/ShopReviewsSection';

export const dynamic = 'force-dynamic';

export default async function ShopProductPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = session ? (session.user as any).id : null;

  const product = await prisma.shopProduct.findUnique({
    where: { slug: params.slug, approved: true },
    include: {
      variants: { orderBy: { order: 'asc' } },
      category: { select: { name: true, slug: true } },
      reviews: { orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, avatar: true } } } }
    }
  });

  if (!product) notFound();

  const myExistingReview = viewerId ? product.reviews.find((r) => r.userId === viewerId) || null : null;

  return (
    <div className="pt-8 pb-16 max-w-5xl">
      <div className="flex items-center gap-1.5 text-xs text-muted mb-5">
        <Link href="/obchod" className="hover:text-accent">Obchod</Link>
        <IconChevronRight className="w-3 h-3" />
        <Link href={`/obchod?kategoria=${product.category.slug}`} className="hover:text-accent">{product.category.name}</Link>
        <IconChevronRight className="w-3 h-3" />
        <span className="text-ink">{product.title}</span>
      </div>

      <h1 className="font-display font-extrabold text-2xl text-ink mb-2">{product.title}</h1>
      {product.reviews.length > 0 && (
        <div className="flex items-center gap-2 mb-6 text-sm">
          {(() => {
            const avg = product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length;
            return (
              <>
                <span className="text-amber-500">{'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}</span>
                <span className="font-semibold text-ink">{avg.toFixed(1)}</span>
              </>
            );
          })()}
          <span className="text-muted">{product.reviews.length} recenzií</span>
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
                <div className="text-xs text-muted mb-0.5">Región</div>
                <div className="font-semibold text-ink">{product.region}</div>
              </div>
            </div>

            <ShopVariantSelector variants={product.variants} />

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

      <ShopReviewsSection
        productId={product.id}
        initialReviews={product.reviews}
        isLoggedIn={!!viewerId}
        myExistingReview={myExistingReview}
      />
    </div>
  );
}
