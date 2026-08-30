import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import MoviePremieresAdmin from '@/components/MoviePremieresAdmin';

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
      premiereDates: {
        orderBy: { releaseDate: 'asc' },
        select: { id: true, country: true, releaseDate: true, distributor: true }
      }
    }
  });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Premiéry</h1>
      <p className="text-sm text-muted mb-6">
        Vyber existujúci film a nastav mu dátumy premiér v jednotlivých krajinách (s distribútorom) a vekové obmedzenie.
        Tieto dáta sa zobrazujú aj na profile filmu, aj v prehľade Kino.
      </p>
      <MoviePremieresAdmin initialMovies={movies} />
    </div>
  );
}
