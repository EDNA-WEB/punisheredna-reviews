import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import MovieLinksAdmin from '@/components/MovieLinksAdmin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminOdkazyPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const [linkTypes, movies] = await Promise.all([
    prisma.movieLinkType.findMany({ orderBy: { order: 'asc' } }),
    prisma.movie.findMany({
      where: { approved: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        poster: true,
        year: true,
        createdAt: true,
        links: { select: { linkTypeId: true, url: true } }
      }
    })
  ]);

  // Filmy zoradíme podľa POČTU priradených odkazov — úplne bez odkazu navrch,
  // potom s jedným, potom s dvoma atď. V rámci rovnakého počtu sú najnovšie
  // pridané filmy prvé, nech sa ani tie nestratia v dlhom zozname.
  const sortedMovies = [...movies].sort((a, b) => {
    if (a.links.length !== b.links.length) return a.links.length - b.links.length;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Slovný prehľad — koľko filmov ešte nemá konkrétny typ odkazu (IMDb, ČSFD).
  const imdbType = linkTypes.find((t) => t.name === 'IMDb');
  const csfdType = linkTypes.find((t) => t.name === 'ČSFD');
  const missingImdb = imdbType ? movies.filter((m) => !m.links.some((l) => l.linkTypeId === imdbType.id)).length : movies.length;
  const missingCsfd = csfdType ? movies.filter((m) => !m.links.some((l) => l.linkTypeId === csfdType.id)).length : movies.length;

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Odkazy</>} description={<><strong className="text-ink">{missingImdb}</strong> {missingImdb === 1 ? 'film ještě nemá' : 'filmů ještě nemá'} IMDb odkaz, <strong className="text-ink">{missingCsfd}</strong> {missingCsfd === 1 ? 'film ještě nemá' : 'filmů ještě nemá'} ČSFD odkaz.</>} />
      <MovieLinksAdmin initialLinkTypes={linkTypes} initialMovies={sortedMovies} />
    </div>
  );
}
