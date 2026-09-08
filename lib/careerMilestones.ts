import { tmdbGetPersonFilmography } from '@/lib/tmdb';

export type Milestone = {
  key: string;
  label: string;
  explanation: string;
  title: string;
  year: string;
  poster: string | null;
  backdropPoster: string | null;
};

// Pripraví "časovú os kariéry" — sériu významných bodov v kariére osoby,
// výhradne z dát, čo TMDb posiela priamo pri filmografii (žiadne ďalšie,
// pomalé dopyty na jednotlivé filmy zvlášť).
export async function buildCareerMilestones(tmdbId: number, role: 'ACTOR' | 'CREATOR'): Promise<Milestone[]> {
  const { asActor, asCrew } = await tmdbGetPersonFilmography(tmdbId);
  const pool = role === 'ACTOR' && asActor.length > 0 ? asActor : [...asActor, ...asCrew];

  const withYear = pool.filter((m) => m.year && !isNaN(parseInt(m.year, 10)));
  if (withYear.length === 0) return [];

  const byYearAsc = [...withYear].sort((a, b) => parseInt(a.year, 10) - parseInt(b.year, 10));
  const milestones: Milestone[] = [];
  const usedTmdbIds = new Set<number>();

  function add(key: string, label: string, explanation: string, item: (typeof withYear)[number]) {
    if (usedTmdbIds.has(item.tmdbId)) return; // jeden film nech nezaberá dva míľniky naraz, nech je os pestrejšia
    usedTmdbIds.add(item.tmdbId);
    milestones.push({ key, label, explanation, title: item.title, year: item.year, poster: item.poster, backdropPoster: item.backdropPoster });
  }

  // 1. Filmový debut — chronologicky prvý titul v kariére.
  add('debut', 'Filmový debut', `Prvý titul v kariére, z roku ${byYearAsc[0].year}.`, byYearAsc[0]);

  // 2. Prvá výrazná rola — prvý chronologicky, kde poradie v titulkoch (TMDb)
  // naznačuje hlavnú, nie vedľajšiu rolu.
  const notableRole = byYearAsc.find((m) => m.order <= 4 && m.tmdbId !== byYearAsc[0].tmdbId);
  if (notableRole) add('notable-role', 'Prvá výrazná rola', `Prvý titul, kde už nešlo len o vedľajšiu postavu.`, notableRole);

  // 3. Najrušnejší rok kariéry — rok s najväčším počtom vydaní.
  const countsByYear = new Map<string, number>();
  for (const m of withYear) countsByYear.set(m.year, (countsByYear.get(m.year) || 0) + 1);
  const busiestYearEntry = Array.from(countsByYear.entries()).sort((a, b) => b[1] - a[1])[0];
  if (busiestYearEntry && busiestYearEntry[1] > 1) {
    const repItem = withYear.find((m) => m.year === busiestYearEntry[0])!;
    add('busiest-year', 'Najrušnejší rok kariéry', `V roku ${busiestYearEntry[0]} vydal(a) až ${busiestYearEntry[1]} titulov naraz.`, repItem);
  }

  // 4. Najsledovanejší film — najviac hlasov na TMDb (nie nutne najlepšie hodnotený).
  const mostVoted = [...withYear].filter((m) => m.voteCount > 0).sort((a, b) => b.voteCount - a.voteCount)[0];
  if (mostVoted) add('most-voted', 'Najznámejší titul', `${mostVoted.voteCount.toLocaleString('sk-SK')} hodnotení na TMDb — najviac zo všetkých jeho titulov.`, mostVoted);

  // 5. Najúspešnejší film — najvyššie hodnotenie (s aspoň troškou hlasov, nech to nie je náhoda).
  const bestRated = [...withYear].filter((m) => m.voteCount >= 20 && m.voteAverage !== null).sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))[0];
  if (bestRated) add('best-rated', 'Najúspešnejší titul', `Hodnotenie ${bestRated.voteAverage?.toFixed(1)}/10 na TMDb.`, bestRated);

  // 6. Najväčší prepadák — najnižšie hodnotenie (rovnaká podmienka na počet hlasov).
  const worstRated = [...withYear].filter((m) => m.voteCount >= 20 && m.voteAverage !== null).sort((a, b) => (a.voteAverage ?? 0) - (b.voteAverage ?? 0))[0];
  if (worstRated) add('worst-rated', 'Najväčší prepadák', `Hodnotenie len ${worstRated.voteAverage?.toFixed(1)}/10 na TMDb.`, worstRated);

  // 7. Najnovší titul — chronologicky posledný.
  const latest = byYearAsc[byYearAsc.length - 1];
  add('latest', 'Najnovší titul', `Zatiaľ posledný titul v kariére, z roku ${latest.year}.`, latest);

  // Zoradenie výsledných míľnikov chronologicky (podľa roku filmu), nech
  // časová os dáva zmysel zľava doprava, nie v poradí, v akom sme ich počítali.
  return milestones.sort((a, b) => parseInt(a.year, 10) - parseInt(b.year, 10));
}
