import { getCachedSiteStats } from '@/lib/cachedMovieData';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

// Jediná informácia o webe, ktorú vidí neprihlásený návštevník — pod formulárom.
export default async function GuestSiteCount() {
  const [{ totalMovies }, dict] = await Promise.all([getCachedSiteStats(), getUserLanguage().then((l) => getDictionary(l))]);
  const t = (key: string) => dict[key] || key;
  if (!totalMovies) return null;

  return (
    <div className="flex justify-center pb-10 -mt-4">
      <div className="inline-flex items-baseline gap-2 rounded-full border border-line bg-card/80 backdrop-blur-sm px-5 py-2.5 shadow-sm">
        <span className="text-xs text-muted">{t('guest.na_webe_mame')}</span>
        <span className="font-display font-extrabold text-xl text-ink tabular-nums">{new Intl.NumberFormat('sk-SK').format(totalMovies)}</span>
        <span className="text-xs text-muted">{t('guest.filmov_a_serialov')}</span>
      </div>
    </div>
  );
}
