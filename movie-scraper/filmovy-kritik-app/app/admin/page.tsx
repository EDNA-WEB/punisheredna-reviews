import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import Link from 'next/link';
import StarRating from '@/components/StarRating';
import AdminReviewActions from '@/components/AdminReviewActions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const reviews = await prisma.review.findMany({
    where: { seasonId: null, episodeId: null },
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { movie: { select: { title: true, slug: true, poster: true } }, _count: { select: { comments: true } } }
  });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
          <h1 className="font-display font-extrabold text-3xl text-ink">Prehľad recenzií</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/movies" className="border border-line text-ink px-5 py-2.5 rounded-full text-sm font-semibold hover:border-accent hover:text-accent">
            Spravovať filmy
          </Link>
          <Link href="/admin/reviews/new" className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark">
            + Nová recenzia
          </Link>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="border border-line rounded-xl p-10 text-center text-muted bg-surface">
          Zatiaľ žiadne recenzie. Najprv pridaj film v sekcii „Spravovať filmy“, potom k nemu napíš recenziu.
        </div>
      ) : (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
          {reviews.map((r) => (
            <div key={r.id} className="flex items-center gap-4 p-4 bg-card">
              <div className="w-12 h-16 rounded-md bg-surface bg-cover bg-center flex-none" style={r.movie.poster ? { backgroundImage: `url('${r.movie.poster}')` } : undefined} />
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-lg text-ink truncate">{r.movie.title}</div>
                <div className="text-xs text-muted mt-1">{new Date(r.createdAt).toLocaleDateString('sk-SK')} · {r._count.comments} komentárov</div>
              </div>
              <AdminReviewActions id={r.id} movieSlug={r.movie.slug} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
