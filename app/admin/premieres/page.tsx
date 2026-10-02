import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import MoviePremieresAdmin from '@/components/MoviePremieresAdmin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminPremieresPage() {
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
      ageRating: true,
      tmdbId: true,
      contentType: true,
      createdAt: true,
      premiereDates: {
        orderBy: { releaseDate: 'asc' },
        select: { id: true, country: true, type: true, releaseDate: true, distributor: true }
      }
    }
  });

  // Filmy bez akejkoľvek premiéry idú navrch (v poradí od najnovšie pridaných),
  // nech sa nestratia niekde v strede dlhého zoznamu. Vyplnené filmy nasledujú
  // za nimi, tiež zoradené od najnovších.
  const sortedMovies = [...movies].sort((a, b) => {
    const aFilled = a.premiereDates.length > 0;
    const bFilled = b.premiereDates.length > 0;
    if (aFilled !== bFilled) return aFilled ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Premiéry</>} description={<>Vyber existující film a nastav mu data premiér v jednotlivých zemích (s distributorem) a věkové omezení. Tato data se zobrazují na profilu filmu i v přehledu Kino.</>} />
      <MoviePremieresAdmin initialMovies={sortedMovies} />
    </div>
  );
}
