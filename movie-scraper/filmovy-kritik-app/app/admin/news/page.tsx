import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import Link from 'next/link';
import AdminNewsActions from '@/components/AdminNewsActions';

export const dynamic = 'force-dynamic';

export default async function AdminNewsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const news = await prisma.newsPost.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
          <h1 className="font-display font-extrabold text-3xl text-ink">Novinky</h1>
        </div>
        <Link href="/admin/news/new" className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark">
          + Nová novinka
        </Link>
      </div>

      {news.length === 0 ? (
        <div className="border border-line rounded-xl p-10 text-center text-muted bg-surface">Zatiaľ žiadne novinky.</div>
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
    </div>
  );
}
