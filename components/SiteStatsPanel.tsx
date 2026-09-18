import { getCachedSiteStats } from '@/lib/cachedMovieData';
import SiteStatsPanelClient from './SiteStatsPanelClient';

export default async function SiteStatsPanel() {
  const { totalMovies, czechCount, onlineCount } = await getCachedSiteStats();

  if (totalMovies === 0) return null;

  return <SiteStatsPanelClient czechCount={czechCount} onlineCount={onlineCount} totalMovies={totalMovies} />;
}
