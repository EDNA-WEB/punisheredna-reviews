import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { IconUser, IconEye } from '@/components/Icons';
import EmptyState from '@/components/EmptyState';

export const dynamic = 'force-dynamic';

export default async function VisitorsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const viewerId = (session.user as any).id;

  const visits = await prisma.profileVisit.findMany({
    where: { profileOwnerId: viewerId },
    orderBy: { visitedAt: 'desc' },
    take: 100,
    include: { visitor: { select: { id: true, name: true, avatar: true } } }
  });

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Návštevníci</h1>
      <p className="text-muted mb-8">Kto si pozrel tvoj profil, s dátumom a časom.</p>

      {visits.length === 0 ? (
        <EmptyState icon={<IconEye className="w-5 h-5" />} title="Zatiaľ ťa nikto nenavštívil" />
      ) : (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
          {visits.map((v) => (
            <Link key={v.id} href={`/profile/${v.visitor.id}`} className="flex items-center gap-4 p-4 bg-card hover:bg-surface transition-colors">
              {v.visitor.avatar ? (
                <img src={v.visitor.avatar} alt={v.visitor.name} className="w-10 h-10 rounded-full object-cover flex-none" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center flex-none">
                  <IconUser className="w-5 h-5 text-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink truncate">{v.visitor.name}</div>
              </div>
              <div className="text-xs text-muted flex-none text-right">
                <div>{new Date(v.visitedAt).toLocaleDateString('sk-SK')}</div>
                <div>{new Date(v.visitedAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
