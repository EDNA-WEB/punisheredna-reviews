import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminTabs from '@/components/AdminTabs';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const since24h = new Date();
  since24h.setHours(since24h.getHours() - 24);

  const [allViews, views24h, newsPosts, blogPosts] = await Promise.all([
    prisma.articleView.groupBy({ by: ['targetType', 'targetId'], _count: { id: true } }),
    prisma.articleView.groupBy({ by: ['targetType', 'targetId'], where: { createdAt: { gte: since24h } }, _count: { id: true } }),
    prisma.newsPost.findMany({ select: { id: true, title: true, slug: true } }),
    prisma.blogPost.findMany({ select: { id: true, title: true } })
  ]);

  const newsById = new Map(newsPosts.map((n) => [n.id, n]));
  const blogById = new Map(blogPosts.map((b) => [b.id, b]));

  const totalByKey = new Map(allViews.map((v) => [`${v.targetType}:${v.targetId}`, v._count.id]));

  const rows = views24h
    .map((v) => {
      const key = `${v.targetType}:${v.targetId}`;
      const title =
        v.targetType === 'news' ? newsById.get(v.targetId)?.title : blogById.get(v.targetId)?.title;
      if (!title) return null;
      const href = v.targetType === 'news' ? `/news/${newsById.get(v.targetId)?.slug}` : `/blog/${v.targetId}`;
      return {
        key,
        title,
        href,
        type: v.targetType,
        views24h: v._count.id,
        totalViews: totalByKey.get(key) || 0
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.views24h - a.views24h);

  const totalViewsAllTime = allViews.reduce((sum, v) => sum + v._count.id, 0);
  const totalViews24h = views24h.reduce((sum, v) => sum + v._count.id, 0);

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia · Viditeľné iba tebe</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-6">Analytics</h1>

      <div className="grid grid-cols-2 gap-4 mb-8 max-w-md">
        <div className="border border-line rounded-xl p-4">
          <div className="text-2xl font-display font-extrabold text-ink">{totalViews24h}</div>
          <div className="text-xs text-muted">zobrazení za 24 hodín</div>
        </div>
        <div className="border border-line rounded-xl p-4">
          <div className="text-2xl font-display font-extrabold text-ink">{totalViewsAllTime}</div>
          <div className="text-xs text-muted">zobrazení celkovo</div>
        </div>
      </div>

      <h2 className="font-display font-bold text-xl text-ink mb-4">Najčítanejšie za 24 hodín</h2>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Za posledných 24 hodín zatiaľ nikto žiadny článok neotvoril.</p>
      ) : (
        <div className="border border-line rounded-xl overflow-hidden divide-y divide-line max-w-2xl">
          {rows.map((r, i) => (
            <Link key={r.key} href={r.href} target="_blank" className="flex items-center gap-3 p-3.5 bg-card hover:bg-surface transition-colors">
              <span className="font-display font-extrabold text-lg text-line w-6 flex-none text-center">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink truncate">{r.title}</div>
                <div className="text-xs text-muted">
                  {r.type === 'news' ? 'Novinka' : 'Blog'} · {r.totalViews} zobrazení celkovo
                </div>
              </div>
              <div className="text-right flex-none">
                <div className="font-display font-bold text-ink">{r.views24h}</div>
                <div className="text-[10px] text-muted">za 24 h</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
