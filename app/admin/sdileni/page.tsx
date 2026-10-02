import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { forgetShareConfig, getShareConfig, shareKey } from '@/lib/articleShare';
import { RETENTION_DAYS } from '@/lib/visitorAnalytics';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ArticleShareAdmin from '@/components/admin/ArticleShareAdmin';

export const dynamic = 'force-dynamic';

type Counted = { key: string; count: number };

// Administrace → Sdílení článků: vypínač, odkazy (aj s umiestnením),
// anonymná analytika návštev. ?clanek=news:ID → podrobnosti jedného článku.
export default async function ArticleSharePage(props: { searchParams: Promise<{ clanek?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') notFound();
  const { clanek } = await props.searchParams;
  const [fType, fId] = (clanek || '').split(':');
  const filter = (fType === 'news' || fType === 'blog') && fId ? { articleType: fType, articleId: fId } : null;

  forgetShareConfig();
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const sessWhere = filter ? { firstSeen: { gte: d30 }, visits: { some: filter } } : { firstSeen: { gte: d30 } };

  const group = async (field: 'sourceTag' | 'referrerHost' | 'country' | 'region' | 'city' | 'deviceType' | 'os' | 'browser' | 'asnOrg'): Promise<Counted[]> => {
    const rows: any[] = await (prisma.visitorSession.groupBy as any)({ by: [field], where: sessWhere, _count: { _all: true } });
    return rows
      .map((r: any) => ({ key: r[field] ?? '', count: r._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  };

  const [cfg, news, blogs, perArticle, perArticle7, lastVisits, daily, breakdowns] = await Promise.all([
    getShareConfig(),
    prisma.newsPost.findMany({
      where: { isDraft: false, OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: { id: true, title: true, slug: true, coverImage: true, createdAt: true }
    }),
    prisma.blogPost.findMany({ where: { isDraft: false, published: true }, orderBy: { createdAt: 'desc' }, take: 80, select: { id: true, title: true, coverImage: true, createdAt: true } }),
    prisma.shareDailyStat.groupBy({ by: ['articleType', 'articleId'], _sum: { visits: true, sessions: true } }),
    prisma.shareDailyStat.groupBy({ by: ['articleType', 'articleId'], where: { day: { gte: d7 } }, _sum: { visits: true } }),
    prisma.shareVisit.groupBy({ by: ['articleType', 'articleId'], _max: { visitedAt: true } }),
    prisma.shareDailyStat.groupBy({
      by: ['day'],
      where: { day: { gte: d30.toISOString().slice(0, 10) }, ...(filter || {}) },
      _sum: { visits: true, sessions: true },
      orderBy: { day: 'asc' }
    }),
    Promise.all((['sourceTag', 'referrerHost', 'country', 'region', 'city', 'deviceType', 'os', 'browser', 'asnOrg'] as const).map(group))
  ]);

  const k = (t: string, id: string) => `${t}:${id}`;
  const stat = new Map<string, { total: number; sessions: number; week: number; last: string | null }>();
  const get = (key: string) => stat.get(key) || (stat.set(key, { total: 0, sessions: 0, week: 0, last: null }), stat.get(key)!);
  perArticle.forEach((r) => {
    const s = get(k(r.articleType, r.articleId));
    s.total = r._sum.visits || 0;
    s.sessions = r._sum.sessions || 0;
  });
  perArticle7.forEach((r) => (get(k(r.articleType, r.articleId)).week = r._sum.visits || 0));
  lastVisits.forEach((r) => (get(k(r.articleType, r.articleId)).last = r._max.visitedAt ? r._max.visitedAt.toISOString() : null));
  const empty = { total: 0, sessions: 0, week: 0, last: null };

  const items = [
    ...news.map((n) => ({
      key: k('news', n.id),
      type: 'news' as const,
      ref: n.slug,
      typeLabel: 'Novinka',
      title: n.title,
      cover: n.coverImage,
      date: n.createdAt.toISOString(),
      path: `/sdilet/clanek/${n.slug}?k=${shareKey('news', n.slug, cfg.salt)}`,
      stats: stat.get(k('news', n.id)) || empty
    })),
    ...blogs.map((b) => ({
      key: k('blog', b.id),
      type: 'blog' as const,
      ref: b.id,
      typeLabel: 'Blog',
      title: b.title,
      cover: b.coverImage,
      date: b.createdAt.toISOString(),
      path: `/sdilet/blog/${b.id}?k=${shareKey('blog', b.id, cfg.salt)}`,
      stats: stat.get(k('blog', b.id)) || empty
    }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  const selected = filter ? items.find((i) => i.key === k(filter.articleType, filter.articleId)) || null : null;
  const totals = filter && selected ? selected.stats : {
    total: perArticle.reduce((s, r) => s + (r._sum.visits || 0), 0),
    sessions: perArticle.reduce((s, r) => s + (r._sum.sessions || 0), 0),
    week: perArticle7.reduce((s, r) => s + (r._sum.visits || 0), 0),
    last: null
  };

  const [sources, referrers, countries, regions, cities, devices, oses, browsers, isps] = breakdowns;
  const optedOut = (await cookies()).get('kf_no_track')?.value === '1';

  return (
    <div className="admin-page">
      <AdminPageHeader
        title={<>Sdílení článků</>}
        description={
          <>
            Nepřihlášený návštěvník uvidí přes sdílecí odkaz jen samotný článek. Návštěvnost se měří anonymně — bez cookies, bez ukládání IP adres;
            podrobnosti se mažou po {RETENTION_DAYS} dnech, trvale zůstávají jen souhrnné počty.
          </>
        }
      />
      <ArticleShareAdmin
        initialEnabled={cfg.enabled}
        initialOptedOut={optedOut}
        items={items}
        selected={selected ? { key: selected.key, title: selected.title } : null}
        totals={{ total: totals.total, sessions: totals.sessions, week: totals.week }}
        daily={daily.map((d) => ({ day: d.day, visits: d._sum.visits || 0 }))}
        breakdowns={{ sources, referrers, countries, regions, cities, devices, oses, browsers, isps }}
      />
    </div>
  );
}
