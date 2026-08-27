import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { IconUser, IconActivity } from '@/components/Icons';

export const dynamic = 'force-dynamic';

function timeAgo(date: Date) {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return 'práve teraz';
  if (diffMin < 60) return `pred ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `pred ${diffH} h`;
  return date.toLocaleDateString('sk-SK');
}

export default async function ActivityPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const viewerId = (session.user as any).id;

  const following = await prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
  const relevantIds = [viewerId, ...following.map((f) => f.followingId)];

  const [mine, others] = await Promise.all([
    prisma.userActivity.findMany({
      where: { userId: { in: relevantIds } },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: { user: { select: { id: true, name: true, avatar: true } } }
    }),
    prisma.userActivity.findMany({
      where: { userId: { notIn: relevantIds } },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: { user: { select: { id: true, name: true, avatar: true } } }
    })
  ]);

  const Row = ({ a }: { a: (typeof mine)[number] }) => (
    <div className="flex items-start gap-3 p-3.5 bg-card">
      <Link href={`/profile/${a.user.id}`} className="flex-none">
        {a.user.avatar ? (
          <img src={a.user.avatar} alt={a.user.name} className="w-14 h-14 rounded-lg object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-surface flex items-center justify-center">
            <IconUser className="w-6 h-6 text-muted" />
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1 pt-0.5">
        <Link href={`/profile/${a.user.id}`} className="text-sm font-semibold text-ink hover:text-accent">
          {a.user.name}
        </Link>
        <div className="text-xs text-muted mt-0.5">Posledná akcia ({timeAgo(a.createdAt)})</div>
        <div className="text-xs text-muted">
          <Link href={a.link} className="text-accent hover:underline">{a.label}</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Aktivita</h1>

      <div className="mb-8">
        <h2 className="font-display font-bold text-lg text-ink mb-3">Ja a moji obľúbení používatelia</h2>
        <div className="border border-line rounded-xl overflow-hidden grid grid-cols-1 sm:grid-cols-3 gap-px bg-line">
          {mine.length === 0 ? (
            <p className="text-sm text-muted p-4 flex items-center gap-2 col-span-full bg-card">
              <IconActivity className="w-4 h-4 flex-none" />
              Zatiaľ žiadna aktivita.
            </p>
          ) : (
            mine.map((a) => <Row key={a.id} a={a} />)
          )}
        </div>
      </div>

      <div>
        <h2 className="font-display font-bold text-lg text-ink mb-3">Ostatní používatelia</h2>
        <div className="border border-line rounded-xl overflow-hidden grid grid-cols-1 sm:grid-cols-3 gap-px bg-line">
          {others.length === 0 ? (
            <p className="text-sm text-muted p-4 flex items-center gap-2 col-span-full bg-card">
              <IconActivity className="w-4 h-4 flex-none" />
              Zatiaľ žiadna aktivita.
            </p>
          ) : (
            others.map((a) => <Row key={a.id} a={a} />)
          )}
        </div>
      </div>
    </div>
  );
}
