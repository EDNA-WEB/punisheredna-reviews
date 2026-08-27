import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { IconUser } from './Icons';
import CriticBadge from './CriticBadge';
import GoldenTicketBadge from './GoldenTicketBadge';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export default async function TopVisitedUsersList() {
  const t = (await getDictionary(await getUserLanguage()));
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const visits = await prisma.profileVisit.groupBy({
    by: ['profileOwnerId'],
    where: { visitedAt: { gte: since } },
    _count: { profileOwnerId: true },
    orderBy: { _count: { profileOwnerId: 'desc' } },
    take: 7
  });

  if (visits.length === 0) return null;

  const users = await prisma.user.findMany({
    where: { id: { in: visits.map((v) => v.profileOwnerId) }, banned: false },
    select: { id: true, name: true, avatar: true, role: true, membershipUntil: true }
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const items = visits
    .map((v) => ({ user: userById.get(v.profileOwnerId), count: v._count.profileOwnerId }))
    .filter((i) => i.user);

  if (items.length === 0) return null;

  return (
    <div className="border border-line rounded-xl p-4 bg-card">
      <h3 className="font-display font-bold text-sm text-ink mb-3">{t['home.najsledovanejsi_pouzivatelia'] || 'Najsledovanejší používatelia'}</h3>
      <div className="space-y-3">
        {items.map(({ user, count }, i) => (
          <Link key={user!.id} href={`/profile/${user!.id}`} className="flex items-center gap-3 group">
            <span className="w-5 text-center text-xs font-extrabold text-accent flex-none">{i + 1}</span>
            {user!.avatar ? (
              <img src={user!.avatar} alt={user!.name} className="w-8 h-8 rounded-full object-cover flex-none" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-none">
                <IconUser className="w-4 h-4 text-muted" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink group-hover:text-accent transition-colors truncate flex items-center gap-1.5">
                {user!.name}
                {user!.role === 'ADMIN' && <CriticBadge size="w-3.5 h-3.5" label={false} />}
                {user!.membershipUntil && user!.membershipUntil > new Date() && <GoldenTicketBadge size={14} />}
              </div>
              <div className="text-[11px] text-muted">{count} návštev profilu</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
