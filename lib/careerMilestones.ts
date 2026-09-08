import { tmdbGetPersonFilmography, tmdbGetMovieTopCast } from '@/lib/tmdb';
import { prisma } from '@/lib/prisma';

export type Milestone = {
  key: string;
  label: string;
  explanation: string;
  title: string;
  year: string;
  poster: string | null;
  backdropPoster: string | null;
};

const MAX_COMBO_CHECKS = 20; // koľko filmov chronologicky najviac preveríme, nech to nespomalí načítanie

// Pripraví "časovú os kariéry" — sériu významných bodov v kariére osoby.
// Zámerne berie do úvahy LEN klasické filmy (TMDb "movie") — seriály, televízne
// programy, ceremónie a podobné TV formáty do rebríčka nepatria.
export async function buildCareerMilestones(tmdbId: number, role: 'ACTOR' | 'CREATOR'): Promise<Milestone[]> {
  const { asActor, asCrew } = await tmdbGetPersonFilmography(tmdbId);
  const combinedPool = role === 'ACTOR' && asActor.length > 0 ? asActor : [...asActor, ...asCrew];

  const pool = combinedPool.filter((m) => m.mediaType === 'movie');
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

  // 1. Filmový debut — chronologicky prvý film v kariére.
  add('debut', 'Filmový debut', `Prvý film v kariére, z roku ${byYearAsc[0].year}.`, byYearAsc[0]);

  // 2. Prvé kombo — chronologicky prvý film, kde osoba nemala hlavnú rolu
  // (order > 0), ALE v hlavnom obsadení bol niekto, koho už máme u nás vo
  // vlastnej databáze osôb — rozumný, overiteľný odhad "známeho" spoluherca,
  // namiesto subjektívneho hádania, kto je slávny.
  if (role === 'ACTOR') {
    let checked = 0;
    for (const film of byYearAsc) {
      if (film.tmdbId === byYearAsc[0].tmdbId) continue; // debut už máme, netreba ho počítať dvakrát
      if (film.order === 0) continue; // hľadáme práve vedľajšiu, nie hlavnú rolu
      if (checked >= MAX_COMBO_CHECKS) break;
      checked++;

      const topCast = await tmdbGetMovieTopCast(film.tmdbId);
      const coStars = topCast.filter((c) => c.tmdbId !== tmdbId);
      if (coStars.length === 0) continue;

      const knownCoStar = await prisma.person.findFirst({
        where: { tmdbId: { in: coStars.map((c) => c.tmdbId) }, approved: true },
        select: { name: true }
      });

      if (knownCoStar) {
        add('first-combo', 'Prvé kombo', `Vedľajšia rola po boku ${knownCoStar.name}, ktorého/ktorú tiež nájdeš u nás.`, film);
        break;
      }
    }
  }

  // 3. Prvá výrazná rola — prvý chronologicky, kde poradie v titulkoch (TMDb)
  // naznačuje hlavnú, nie vedľajšiu rolu.
  const notableRole = byYearAsc.find((m) => m.order <= 4 && m.tmdbId !== byYearAsc[0].tmdbId);
  if (notableRole) add('notable-role', 'Prvá výrazná rola', `Prvý film, kde už nešlo len o vedľajšiu postavu.`, notableRole);

  // 4. Najrušnejší rok kariéry — rok s najväčším počtom vydaných filmov.
  const countsByYear = new Map<string, number>();
  for (const m of withYear) countsByYear.set(m.year, (countsByYear.get(m.year) || 0) + 1);
  const busiestYearEntry = Array.from(countsByYear.entries()).sort((a, b) => b[1] - a[1])[0];
  if (busiestYearEntry && busiestYearEntry[1] > 1) {
    const repItem = withYear.find((m) => m.year === busiestYearEntry[0])!;
    add('busiest-year', 'Najrušnejší rok kariéry', `V roku ${busiestYearEntry[0]} vydal(a) až ${busiestYearEntry[1]} filmov naraz.`, repItem);
  }

  // 5. Najsledovanejší film — najviac hlasov na TMDb (nie nutne najlepšie hodnotený).
  const mostVoted = [...withYear].filter((m) => m.voteCount > 0).sort((a, b) => b.voteCount - a.voteCount)[0];
  if (mostVoted) add('most-voted', 'Najznámejší film', `${mostVoted.voteCount.toLocaleString('sk-SK')} hodnotení na TMDb — najviac zo všetkých jeho filmov.`, mostVoted);

  // 6. Najúspešnejší film — najvyššie hodnotenie (s aspoň troškou hlasov, nech to nie je náhoda).
  const bestRated = [...withYear].filter((m) => m.voteCount >= 20 && m.voteAverage !== null).sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))[0];
  if (bestRated) add('best-rated', 'Najúspešnejší film', `Hodnotenie ${bestRated.voteAverage?.toFixed(1)}/10 na TMDb.`, bestRated);

  // 7. Najväčší prepadák — najnižšie hodnotenie (rovnaká podmienka na počet hlasov).
  const worstRated = [...withYear].filter((m) => m.voteCount >= 20 && m.voteAverage !== null).sort((a, b) => (a.voteAverage ?? 0) - (b.voteAverage ?? 0))[0];
  if (worstRated) add('worst-rated', 'Najväčší prepadák', `Hodnotenie len ${worstRated.voteAverage?.toFixed(1)}/10 na TMDb.`, worstRated);

  // 8. Najnovší film — chronologicky posledný.
  const latest = byYearAsc[byYearAsc.length - 1];
  add('latest', 'Najnovší film', `Zatiaľ posledný film v kariére, z roku ${latest.year}.`, latest);

  // Zoradenie výsledných míľnikov chronologicky (podľa roku filmu), nech
  // časová os dáva zmysel zľava doprava, nie v poradí, v akom sme ich počítali.
  return milestones.sort((a, b) => parseInt(a.year, 10) - parseInt(b.year, 10));
}
