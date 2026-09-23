import { getCachedSiteStats } from '@/lib/cachedMovieData';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export default async function SiteStatsPanel() {
  const { totalMovies, czechCount, onlineCount } = await getCachedSiteStats();
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;

  if (totalMovies === 0) return null;

  return (
    <div className="hidden xl:block fixed right-6 top-1/2 -translate-y-1/2 z-10 w-48">
      <div className="bg-card/90 backdrop-blur-sm border border-line rounded-2xl p-4 shadow-lg">
        <div className="text-[10px] font-bold uppercase tracking-wider text-accent mb-3">{t('statspanel.na_webe_mame')}</div>

        <div className="mb-4">
          <div className="font-display font-extrabold text-3xl text-ink leading-none">{czechCount}</div>
          <div className="text-xs text-muted mt-1">{t('statspanel.profilov_cestina')}</div>
        </div>

        <div className="mb-1">
          <div className="font-display font-extrabold text-3xl text-ink leading-none">{onlineCount}</div>
          <div className="text-xs text-muted mt-1">{t('statspanel.dostupnych_online')}</div>
        </div>

        <div className="text-[10px] text-muted mt-3 pt-3 border-t border-line">
          {t('statspanel.z_celkovo')} {totalMovies} {t('statspanel.titulov')}
        </div>
      </div>
    </div>
  );
}
