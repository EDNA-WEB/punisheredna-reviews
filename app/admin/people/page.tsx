import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminTabs from '@/components/AdminTabs';
import AdminPersonActions from '@/components/AdminPersonActions';
import ApprovePersonButton from '@/components/ApprovePersonButton';

export const dynamic = 'force-dynamic';

export default async function AdminPeoplePage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const [pending, approved] = await Promise.all([
    prisma.person.findMany({
      where: { approved: false },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { followers: true } }, submittedBy: { select: { name: true } } }
    }),
    prisma.person.findMany({
      where: { approved: true },
      orderBy: { name: 'asc' },
      take: 300,
      include: { _count: { select: { followers: true } }, submittedBy: { select: { name: true } } }
    })
  ]);

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
          <h1 className="font-display font-extrabold text-3xl text-ink">Herci a tvorcovia</h1>
        </div>
        <Link href="/admin/people/new" className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark">
          + Pridať osobu
        </Link>
      </div>

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-bold text-lg text-ink mb-3">Čakajú na schválenie ({pending.length})</h2>
          <div className="border border-amber-300 rounded-xl divide-y divide-amber-200 overflow-hidden bg-amber-50">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-full bg-surface bg-cover bg-center flex-none" style={p.photo ? { backgroundImage: `url('${p.photo}')` } : undefined} />
                <div className="flex-1 min-w-0">
                  <Link href={`/osobnost/${p.slug}`} className="font-display font-bold text-ink hover:text-accent">{p.name}</Link>
                  <div className="text-xs text-muted mt-1">
                    {p.role === 'ACTOR' ? 'Herec/herečka' : 'Tvorca'} · navrhol/-a {p.submittedBy?.name || 'neznámy'}
                  </div>
                </div>
                <ApprovePersonButton id={p.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {approved.length === 0 ? (
        <div className="border border-line rounded-xl p-10 text-center text-muted bg-surface">
          Zatiaľ žiadni herci ani tvorcovia. Pridaj prvého.
        </div>
      ) : (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
          {approved.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4 bg-card">
              <div className="w-12 h-12 rounded-full bg-surface bg-cover bg-center flex-none" style={p.photo ? { backgroundImage: `url('${p.photo}')` } : undefined} />
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-lg text-ink truncate">{p.name}</div>
                <div className="text-xs text-muted mt-1">{p.role === 'ACTOR' ? 'Herec/herečka' : 'Tvorca'} · {p._count.followers} sledovateľov</div>
              </div>
              <AdminPersonActions id={p.id} slug={p.slug} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
