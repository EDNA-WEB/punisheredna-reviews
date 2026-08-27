import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import UserBanToggle from '@/components/UserBanToggle';
import UserRestrictionsToggle from '@/components/UserRestrictionsToggle';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const users = await prisma.user.findMany({
    where: { role: 'READER' },
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { _count: { select: { comments: true } } }
  });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Čitatelia</h1>

      {users.length === 0 ? (
        <div className="border border-line rounded-xl p-10 text-center text-muted bg-surface">
          Zatiaľ sa nikto nezaregistroval.
        </div>
      ) : (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-4 p-4 bg-card flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <div className="font-semibold text-ink flex items-center gap-2">
                  {u.name}
                  {u.banned && (
                    <span className="text-[11px] font-semibold text-danger border border-danger px-2 py-0.5 rounded-full">
                      Zablokovaný
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted">{u.email}</div>
              </div>
              <div className="text-xs text-muted">
                {u._count.comments} komentárov · registrovaný{' '}
                {new Date(u.createdAt).toLocaleDateString('sk-SK')}
              </div>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <UserBanToggle id={u.id} banned={u.banned} />
                <UserRestrictionsToggle
                  id={u.id}
                  initial={{ reviewsDisabled: u.reviewsDisabled, ratingsDisabled: u.ratingsDisabled, commentsDisabled: u.commentsDisabled }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
