import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SearchParams = {
  types?: string;
  birthPlace?: string;
  deathPlace?: string;
  birthYearFrom?: string;
  birthYearTo?: string;
  deathYearFrom?: string;
  deathYearTo?: string;
  hasBio?: string;
};

export default async function PeopleResultsPage({ searchParams }: { searchParams: SearchParams }) {
  const types = searchParams?.types ? searchParams.types.split(',').filter(Boolean) : [];
  const birthPlace = searchParams?.birthPlace || null;
  const deathPlace = searchParams?.deathPlace || null;
  const hasBio = searchParams?.hasBio === '1';

  const people = await prisma.person.findMany({
    where: {
      ...(types.length > 0 ? { subRole: { in: types } } : {}),
      ...(birthPlace ? { birthPlace } : {}),
      ...(deathPlace ? { deathPlace } : {}),
      ...(hasBio ? { bio: { not: null } } : {})
    },
    orderBy: { name: 'asc' },
    include: { _count: { select: { followers: true } } }
  });

  const byYear = (p: (typeof people)[number]) => {
    if (searchParams?.birthYearFrom || searchParams?.birthYearTo) {
      if (!p.birthDate) return false;
      const y = new Date(p.birthDate).getFullYear();
      if (searchParams.birthYearFrom && y < Number(searchParams.birthYearFrom)) return false;
      if (searchParams.birthYearTo && y > Number(searchParams.birthYearTo)) return false;
    }
    if (searchParams?.deathYearFrom || searchParams?.deathYearTo) {
      if (!p.deathDate) return false;
      const y = new Date(p.deathDate).getFullYear();
      if (searchParams.deathYearFrom && y < Number(searchParams.deathYearFrom)) return false;
      if (searchParams.deathYearTo && y > Number(searchParams.deathYearTo)) return false;
    }
    return true;
  };

  const filtered = people.filter(byYear);

  return (
    <div className="pt-8">
      <Link href="/tvorcovia/filter" className="text-sm text-muted hover:text-accent inline-block mb-5">← Upraviť filter</Link>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Výsledky vyhľadávania</h1>
      <p className="text-muted mb-8">{filtered.length} nájdených osôb.</p>

      {filtered.length === 0 ? (
        <div className="border border-line rounded-xl p-12 text-center text-muted bg-surface">
          Nič sa nenašlo. Skús upraviť filter.
        </div>
      ) : (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden">
          {filtered.map((p) => (
            <Link key={p.id} href={`/osobnost/${p.slug}`} className="flex items-center gap-4 p-4 bg-card hover:bg-surface transition-colors">
              <div className="w-12 h-12 rounded-full bg-surface bg-cover bg-center flex-none" style={p.photo ? { backgroundImage: `url('${p.photo}')` } : undefined} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  {p.name}
                </div>
                <div className="text-xs text-muted mt-0.5">{p.subRole || (p.role === 'ACTOR' ? 'Herec/herečka' : 'Tvorca')}</div>
              </div>
              <div className="text-xs font-semibold text-muted flex-none">{p._count.followers} sledovateľov</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
