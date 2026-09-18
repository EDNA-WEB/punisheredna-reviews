import { getCachedSiteStats } from '@/lib/cachedMovieData';

export default async function SiteStatsPanel() {
  const { totalMovies, czechCount, onlineCount } = await getCachedSiteStats();

  if (totalMovies === 0) return null;

  return (
    <div className="hidden xl:block fixed right-6 top-1/2 -translate-y-1/2 z-10 w-48">
      <div className="bg-card/90 backdrop-blur-sm border border-line rounded-2xl p-4 shadow-lg">
        <div className="text-[10px] font-bold uppercase tracking-wider text-accent mb-3">Na webe máme</div>

        <div className="mb-4">
          <div className="font-display font-extrabold text-3xl text-ink leading-none">{czechCount}</div>
          <div className="text-xs text-muted mt-1">profilov filmov v češtine</div>
        </div>

        <div className="mb-1">
          <div className="font-display font-extrabold text-3xl text-ink leading-none">{onlineCount}</div>
          <div className="text-xs text-muted mt-1">filmov a seriálov dostupných online</div>
        </div>

        <div className="text-[10px] text-muted mt-3 pt-3 border-t border-line">z celkovo {totalMovies} titulov</div>
      </div>
    </div>
  );
}
