import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import MovieLinksAdmin from '@/components/MovieLinksAdmin';

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
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Odkazy</h1>
      <p className="text-sm text-muted mb-6">
        <strong className="text-ink">{missingImdb}</strong> {missingImdb === 1 ? 'film ešte nemá' : 'filmov ešte nemá'} IMDb
        odkaz, <strong className="text-ink">{missingCsfd}</strong> {missingCsfd === 1 ? 'film ešte nemá' : 'filmov ešte nemá'} ČSFD
        odkaz.
      </p>
      <MovieLinksAdmin initialLinkTypes={linkTypes} initialMovies={sortedMovies} />
    </div>
  );
}
