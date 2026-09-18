import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import OnlineAdminList from '@/components/OnlineAdminList';
import OnlineReportsList from '@/components/OnlineReportsList';
import FetchTmdbPopularityButton from '@/components/FetchTmdbPopularityButton';

export const dynamic = 'force-dynamic';

export default async function AdminOnlinePage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const [movies, reports] = await Promise.all([
    prisma.movie.findMany({
      where: { approved: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        poster: true,
        watchUrl: true,
        isCamVersion: true,
        onlineImage: true,
        contentType: true,
        tmdbId: true,
        tmdbPopularity: true,
        createdAt: true,
        seasons: {
          orderBy: { number: 'asc' },
          select: {
            id: true,
            number: true,
            episodes: {
              orderBy: { number: 'asc' },
              select: { id: true, number: true, title: true, onlineImage: true, onlineUrl: true }
            }
          }
        }
      }
    }),
    prisma.onlineReport.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      include: { movie: { select: { title: true, slug: true } }, reporter: { select: { name: true } } }
    })
  ]);

  // Filmy/seriály bez online odkazu idú navrch, zoradené podľa toho, ako
  // veľmi sú známe (popularita z TMDb — vyšší = známejší najprv), nech sa
  // najprv riešia tie, čo diváci hľadajú najčastejšie. Filmy bez natiahnutej
  // popularity (zatiaľ nikdy sa nenatiahla, alebo film nie je na TMDb) idú
  // celkom dole v rámci tejto skupiny. Vyplnené filmy nasledujú za nimi,
  // zoradené od najnovšie pridaných (ako doteraz).
  const sortedMovies = [...movies].sort((a, b) => {
    const aFilled = a.contentType === 'Seriál' ? a.seasons.some((s) => s.episodes.some((ep) => ep.onlineUrl)) : !!a.watchUrl;
    const bFilled = b.contentType === 'Seriál' ? b.seasons.some((s) => s.episodes.some((ep) => ep.onlineUrl)) : !!b.watchUrl;
    if (aFilled !== bFilled) return aFilled ? 1 : -1;
    if (!aFilled) {
      const aPop = a.tmdbPopularity ?? -1;
      const bPop = b.tmdbPopularity ?? -1;
      if (aPop !== bPop) return bPop - aPop;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Slovný prehľad — koľko filmov/seriálov už má nastavené online sledovanie
  // a koľkým ešte chýba (rovnaká definícia "vyplnené" ako pri triedení vyššie).
  const filledCount = movies.filter((m) =>
    m.contentType === 'Seriál' ? m.seasons.some((s) => s.episodes.some((ep) => ep.onlineUrl)) : !!m.watchUrl
  ).length;
  const missingCount = movies.length - filledCount;

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Online</h1>
      <p className="text-sm text-muted mb-1 max-w-2xl">
        Nastav odkaz, kam sa diváci presmerujú, keď kliknú na náhľad v záložke "Online", a náhľadový obrázok, ktorý sa
        im pri tom zobrazí. Pri seriáloch vieš rozkliknúť aj jednotlivé epizódy a nastaviť to isté pre každú zvlášť.
      </p>
      <p className="text-sm mb-6">
        <strong className="text-ink">{filledCount}</strong> {filledCount === 1 ? 'film má' : 'filmov má'} nastavené online,{' '}
        <strong className="text-ink">{missingCount}</strong> {missingCount === 1 ? 'film ešte nemá' : 'filmov ešte nemá'} nastavené online.
      </p>

      <FetchTmdbPopularityButton />

      <OnlineReportsList
        initialReports={reports.map((r) => ({
          id: r.id,
          movieTitle: r.movie.title,
          movieSlug: r.movie.slug,
          reporterName: r.reporter?.name || null,
          note: r.note,
          createdAt: r.createdAt.toISOString()
        }))}
      />

      <OnlineAdminList movies={sortedMovies} />
    </div>
  );
}
