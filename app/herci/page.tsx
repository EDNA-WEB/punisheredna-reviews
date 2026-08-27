import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ActorsPage() {
  const actors = await prisma.person.findMany({
    where: { role: 'ACTOR', approved: true },
    orderBy: { followers: { _count: 'desc' } },
    include: { _count: { select: { followers: true } } }
  });

  return (
    <div className="pt-8">
      <Link href="/" className="text-sm text-muted hover:text-accent inline-block mb-5">← Späť na hlavnú stránku</Link>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Herci a herečky</h1>
      <p className="text-muted mb-8">Zoradení podľa počtu sledovateľov.</p>

      {actors.length === 0 ? (
        <div className="border border-line rounded-xl p-12 text-center text-muted bg-surface">
          Zatiaľ žiadni herci.
        </div>
      ) : (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
          {actors.map((p, i) => (
            <Link key={p.id} href={`/osobnost/${p.slug}`} className="flex items-center gap-4 p-4 bg-card hover:bg-surface transition-colors">
              <span className="w-8 text-center font-display font-extrabold text-lg text-accent flex-none">{i + 1}</span>
              <div className="w-12 h-12 rounded-full bg-surface bg-cover bg-center flex-none" style={p.photo ? { backgroundImage: `url('${p.photo}')` } : undefined} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink truncate">{p.name}</div>
              </div>
              <div className="text-xs font-semibold text-muted flex-none">{p._count.followers} sledovateľov</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
