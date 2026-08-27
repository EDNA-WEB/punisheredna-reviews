import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminTabs from '@/components/AdminTabs';

export const dynamic = 'force-dynamic';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: 'vytvoril(a)', color: 'text-accent' },
  updated: { label: 'upravil(a)', color: 'text-ink' },
  published: { label: 'zverejnil(a)', color: 'text-emerald-600' },
  unpublished: { label: 'skryl(a)', color: 'text-muted' },
  deleted: { label: 'zmazal(a)', color: 'text-danger' },
  reverted: { label: 'obnovil(a) staršiu verziu', color: 'text-accent' }
};

export default async function AuditLogPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const PAGE_SIZE = 40;
  const page = Math.max(1, Number(searchParams?.page) || 1);

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.auditLog.count()
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia · Viditeľné iba tebe</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Audit log</h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Podrobný záznam o tom, kto a čo urobil pri vytváraní a úprave novinky/blog článkov — kto článok vytvoril,
        čo pri úprave zmenil, a kto ho zmazal.
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">Zatiaľ žiadna zaznamenaná aktivita.</p>
      ) : (
        <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
          {entries.map((e) => {
            const meta = ACTION_LABELS[e.action] || { label: e.action, color: 'text-ink' };
            const href = e.targetType === 'news' ? `/admin/news/${e.targetId}/edit` : `/blog/${e.targetId}`;
            return (
              <div key={e.id} className="p-3.5 bg-card">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-semibold text-ink">{e.userName}</span>
                  <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
                  <span className="text-muted">{e.targetType === 'news' ? 'novinku' : 'blog článok'}</span>
                  <Link href={href} className="font-semibold text-accent hover:underline truncate max-w-xs">
                    "{e.targetTitle}"
                  </Link>
                  <span className="text-xs text-muted ml-auto whitespace-nowrap">
                    {e.createdAt.toLocaleDateString('sk-SK')} {e.createdAt.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {e.details && <p className="text-xs text-muted mt-1.5">{e.details}</p>}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-6">
          {page > 1 && (
            <Link href={`/admin/audit-log?page=${page - 1}`} className="text-sm font-semibold text-accent hover:underline">
              ← Novšie
            </Link>
          )}
          <span className="text-sm text-muted">Strana {page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/admin/audit-log?page=${page + 1}`} className="text-sm font-semibold text-accent hover:underline">
              Staršie →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
