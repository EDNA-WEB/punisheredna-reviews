import type { Top10Movie } from './top10';

// Riadok s údajmi pod názvom: „Minisérie · 2026 · 7 epizod · 18+“ / „Film · 2026 · 2 h 9 min · 15+“
export function top10Meta(m: Pick<Top10Movie, 'contentType' | 'releaseDate' | 'year' | 'episodes' | 'runtime' | 'ageRating'>) {
  const isSeries = m.contentType === 'Seriál';
  const parts: string[] = [];
  parts.push(isSeries ? 'Seriál' : 'Film');
  const rd = m.releaseDate ? new Date(m.releaseDate) : null;
  if (rd && rd.getTime() > Date.now()) parts.push(`Premiéra ${rd.toLocaleDateString('cs-CZ')}`);
  else if (m.year) parts.push(m.year);
  if (isSeries && m.episodes) parts.push(`${m.episodes} ${m.episodes === 1 ? 'epizoda' : m.episodes < 5 ? 'epizody' : 'epizod'}`);
  if (!isSeries && m.runtime) parts.push(m.runtime >= 60 ? `${Math.floor(m.runtime / 60)} h ${m.runtime % 60} min` : `${m.runtime} min`);
  if (m.ageRating) parts.push(m.ageRating);
  return parts.join(' · ');
}
