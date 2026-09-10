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

  // Filmy bez zaujímavostí idú navrch (od najnovšie pridaných), nech sa
  // nestratia v dlhom zozname. Vyplnené filmy nasledujú za nimi, tiež od najnovších.
  const sortedMovies = [...movies].sort((a, b) => {
    const aFilled = a._count.trivia > 0;
    const bFilled = b._count.trivia > 0;
    if (aFilled !== bFilled) return aFilled ? 1 : -1;
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
