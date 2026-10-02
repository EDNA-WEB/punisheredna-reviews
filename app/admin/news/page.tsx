import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminNewsActions from '@/components/AdminNewsActions';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

const PER_PAGE = 30;

export default async function AdminNewsPage(props: { searchParams?: Promise<{ strana?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const sp = (await props.searchParams) || {};
  const page = Math.max(1, parseInt(sp.strana || '1', 10) || 1);

  // Len stĺpce, ktoré zoznam zobrazuje (bez celého textu článku) a len jedna
  // stránka naraz — predtým sa načítali všetky novinky so všetkými stĺpcami.
  const [news, total] = await Promise.all([
    prisma.newsPost.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, slug: true, title: true, coverImage: true, isDraft: true, publishAt: true, createdAt: true }
    }),
    prisma.newsPost.count()
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="admin-page">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <AdminPageHeader title={<>Novinky</>} compact />
        </div>
        <Link href="/admin/news/new" className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark">
          + Nová novinka
        </Link>
      </div>

      {news.length === 0 ? (
        <div className="border border-line rounded-xl p-10 text-center text-muted bg-surface">Zatím žádné novinky.</div>
      ) : (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
          {news.map((n) => (
            <div key={n.id} className="flex items-center gap-4 p-4 bg-card">
              <div
                className="w-16 h-16 rounded-lg bg-surface bg-cover bg-center flex-none"
                style={n.coverImage ? { backgroundImage: `url('${n.coverImage}')` } : undefined}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg text-ink truncate">{n.title}</span>
                  {n.isDraft && (
                    <span className="text-[10px] font-semibold text-accent border border-accent/40 px-2 py-0.5 rounded-full flex-none whitespace-nowrap">
                      📝 Rozpísané
                    </span>
                  )}
                  {!n.isDraft && n.publishAt && n.publishAt > new Date() && (
                    <span className="text-[10px] font-semibold text-accent border border-accent/40 px-2 py-0.5 rounded-full flex-none whitespace-nowrap">
                      Naplánované na {n.publishAt.toLocaleDateString('sk-SK')} {n.publishAt.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted mt-1">{new Date(n.createdAt).toLocaleDateString('sk-SK')}</div>
              </div>
              <AdminNewsActions id={n.id} slug={n.slug} />
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-4 mt-6 text-sm" aria-label="Stránkování">
          {page > 1 ? (
            <Link href={`/admin/news?strana=${page - 1}`} className="px-4 py-2 rounded-full border border-line bg-card font-semibold text-ink hover:border-accent">
              Předchozí
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Strana {page} z {pages} · celkem {total}
          </span>
          {page < pages ? (
            <Link href={`/admin/news?strana=${page + 1}`} className="px-4 py-2 rounded-full border border-line bg-card font-semibold text-ink hover:border-accent">
              Další
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
