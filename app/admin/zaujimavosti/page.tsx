import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import TriviaAdminList from '@/components/TriviaAdminList';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

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
    <div className="admin-page">
      <AdminPageHeader title={<>Zajímavosti</>} description={<>Hromadné přidávání zajímavostí napříč více filmy najednou. Jednotlivé úpravy zůstávají možné i přímo ve formuláři pro úpravu filmu.</>} />
      <TriviaAdminList initialMovies={sortedMovies} />
    </div>
  );
}
