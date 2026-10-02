import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ArticleShareAdmin from '@/components/admin/ArticleShareAdmin';

export const dynamic = 'force-dynamic';

// Administrace → Sdílení článků: hlavný vypínač + odkazy na zdieľanie.
export default async function ArticleSharePage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') notFound();

  const now = new Date();
  const [settings, news, blogs] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 'singleton' }, select: { articleShareEnabled: true } }),
    prisma.newsPost.findMany({
      where: { isDraft: false, OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { id: true, title: true, slug: true, coverImage: true, createdAt: true }
    }),
    prisma.blogPost.findMany({
      where: { isDraft: false, published: true },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { id: true, title: true, coverImage: true, createdAt: true }
    })
  ]);

  const items = [
    ...news.map((n) => ({ key: `n-${n.id}`, type: 'Novinka', title: n.title, cover: n.coverImage, date: n.createdAt.toISOString(), path: `/sdilet/clanek/${n.slug}` })),
    ...blogs.map((b) => ({ key: `b-${b.id}`, type: 'Blog', title: b.title, cover: b.coverImage, date: b.createdAt.toISOString(), path: `/sdilet/blog/${b.id}` }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="admin-content">
      <h1 className="font-display font-extrabold text-2xl text-ink mb-1">Sdílení článků</h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Dočasná funkce: neprihlášený návštěvník uvidí přes sdílecí odkaz jen samotný článek — bez menu, hlavičky, patičky, komentářů a bez možnosti
        přejít kamkoli jinam na webu. Přihlášenému se článek otevře normálně.
      </p>
      <ArticleShareAdmin initialEnabled={!!settings?.articleShareEnabled} items={items} />
    </div>
  );
}
