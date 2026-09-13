import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PersonAdvancedFilterForm from '@/components/PersonAdvancedFilterForm';

export const dynamic = 'force-dynamic';

export default async function TvorcoviaFilterPage() {
  const people = await prisma.person.findMany({ select: { birthPlace: true, deathPlace: true } });
  const birthPlaces = Array.from(new Set(people.map((p) => p.birthPlace).filter(Boolean))) as string[];
  const deathPlaces = Array.from(new Set(people.map((p) => p.deathPlace).filter(Boolean))) as string[];

  return (
    <div className="pt-6">
      <div className="flex items-center gap-1 border-b border-line mb-0">
        <Link href="/recenzie/filter" className="text-sm font-semibold px-4 py-3 border-b-2 border-transparent text-muted hover:text-ink">
          Filmy
        </Link>
        <Link href="/tvorcovia/filter" className="text-sm font-semibold px-4 py-3 border-b-2 border-accent text-accent">
          Tvorcovia
        </Link>
      </div>

      <PersonAdvancedFilterForm birthPlaces={birthPlaces.sort()} deathPlaces={deathPlaces.sort()} />
    </div>
  );
}
