import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import TriviaAdminList from '@/components/TriviaAdminList';

export const dynamic = 'force-dynamic';

export default async function AdminTriviaPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const movies = await prisma.movie.findMany({
    where: { approved: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      poster: true,
      year: true,
      createdAt: true,
      _count: { select: { trivia: true } }
    }
  });

  // Filmy zoradíme podľa POČTU zaujímavostí — bez žiadnej navrch, potom s
  // jednou, potom s dvomi atď. V rámci rovnakého počtu sú najnovšie pridané
  // filmy prvé, nech sa ani tie nestratia v dlhom zozname.
  const sortedMovies = [...movies].sort((a, b) => {
    if (a._count.trivia !== b._count.trivia) return a._count.trivia - b._count.trivia;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Zaujímavosti</h1>
      <p className="text-sm text-muted mb-6">
        Hromadné pridávanie zaujímavostí naprieč viacerými filmami naraz. Jednotlivé úpravy zostávajú možné aj priamo
        vo formulári na úpravu filmu.
      </p>
      <TriviaAdminList initialMovies={sortedMovies} />
    </div>
  );
}
