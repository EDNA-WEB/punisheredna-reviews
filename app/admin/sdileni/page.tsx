import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { forgetShareConfig, getShareConfig, shareKey } from '@/lib/articleShare';
import ArticleShareAdmin from '@/components/admin/ArticleShareAdmin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

// Administrace → Sdílení článků: vypínač, odkazy s tajným kľúčom a štatistika.
export default async function ArticleSharePage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') notFound();

  forgetShareConfig(); // vždy čerstvé nastavenie
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [cfg, news, blogs, totals, recent, uniques, lasts, sources] = await Promise.all([
    getShareConfig(),
    prisma.newsPost.findMany({
      where: { isDraft: false, OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: { id: true, title: true, slug: true, coverImage: true, createdAt: true }
    }),
    prisma.blogPost.findMany({
      where: { isDraft: false, published: true },
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: { id: true, title: true, coverImage: true, createdAt: true }
    }),
    prisma.articleShareView.groupBy({ by: ['articleType', 'articleId'], _count: { _all: true } }),
    prisma.articleShareView.groupBy({ by: ['articleType', 'articleId'], where: { createdAt: { gte: d7 } }, _count: { _all: true } }),
    prisma.articleShareView.groupBy({ by: ['articleType', 'articleId', 'visitorHash'] }),
    prisma.articleShareView.groupBy({ by: ['articleType', 'articleId'], _max: { createdAt: true } }),
    prisma.articleShareView.groupBy({ by: ['source'], _count: { _all: true } })
  ]);

  const key = (t: string, id: string) => `${t}:${id}`;
  const stat = new Map<string, { total: number; week: number; unique: number; last: string | null }>();
  const get = (k: string) => stat.get(k) || (stat.set(k, { total: 0, week: 0, unique: 0, last: null }), stat.get(k)!);
  totals.forEach((r) => (get(key(r.articleType, r.articleId)).total = r._count._all));
  recent.forEach((r) => (get(key(r.articleType, r.articleId)).week = r._count._all));
  uniques.forEach((r) => get(key(r.articleType, r.articleId)).unique++);
  lasts.forEach((r) => (get(key(r.articleType, r.articleId)).last = r._max.createdAt ? r._max.createdAt.toISOString() : null));

  const empty = { total: 0, week: 0, unique: 0, last: null };
  const items = [
    ...news.map((n) => ({
      key: `news-${n.id}`,
      type: 'Novinka',
      title: n.title,
      cover: n.coverImage,
      date: n.createdAt.toISOString(),
      path: `/sdilet/clanek/${n.slug}?k=${shareKey('news', n.slug, cfg.salt)}`,
      stats: stat.get(key('news', n.id)) || empty
    })),
    ...blogs.map((b) => ({
      key: `blog-${b.id}`,
      type: 'Blog',
      title: b.title,
      cover: b.coverImage,
      date: b.createdAt.toISOString(),
      path: `/sdilet/blog/${b.id}?k=${shareKey('blog', b.id, cfg.salt)}`,
      stats: stat.get(key('blog', b.id)) || empty
    }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  const summary = {
    total: totals.reduce((s, r) => s + r._count._all, 0),
    week: recent.reduce((s, r) => s + r._count._all, 0),
    unique: new Set(uniques.map((u) => u.visitorHash)).size,
    articles: totals.length,
    sources: sources
      .map((s) => ({ source: s.source || 'Přímý odkaz / aplikace', count: s._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  };

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Sdílení článků</>} description={<>Dočasná funkce: nepřihlášený návštěvník uvidí přes sdílecí odkaz jen samotný článek — bez menu, hlavičky, patičky, komentářů a bez možnosti přejít
        kamkoli jinam. Každý odkaz obsahuje tajný klíč, takže se nedá uhodnout jiný článek. Přihlášenému se článek otevře normálně.</>} />
      <ArticleShareAdmin initialEnabled={cfg.enabled} items={items} summary={summary} />
    </div>
  );
}
