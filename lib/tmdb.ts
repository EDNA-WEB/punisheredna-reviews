// Pomocné funkcie na komunikáciu s oficiálnym TMDb API (themoviedb.org).
// Dáta sa zobrazujú s uvedením zdroja "Zdroj dát: TMDb", presne v súlade s ich podmienkami používania.


const TMDB_BASE = 'https://api.themoviedb.org/3';

// TMDb vracia názvy krajín (production_countries) VŽDY po anglicky, bez ohľadu na
// nastavený jazyk požiadavky — ide o obmedzenie ich API. Prekladáme si ich preto
// sami podľa ISO kódu, aspoň pre bežne sa vyskytujúce krajiny.
const COUNTRY_NAMES_CS: Record<string, string> = {
  US: 'USA',
  GB: 'Velká Británie',
  CZ: 'Česko',
  SK: 'Slovensko',
  DE: 'Německo',
  FR: 'Francie',
  IT: 'Itálie',
  ES: 'Španělsko',
  CA: 'Kanada',
  AU: 'Austrálie',
  JP: 'Japonsko',
  KR: 'Jižní Korea',
  CN: 'Čína',
  RU: 'Rusko',
  IN: 'Indie',
  NL: 'Nizozemsko',
  BE: 'Belgie',
  AT: 'Rakousko',
  CH: 'Švýcarsko',
  SE: 'Švédsko',
  NO: 'Norsko',
  DK: 'Dánsko',
  FI: 'Finsko',
  PL: 'Polsko',
  HU: 'Maďarsko',
  IE: 'Irsko',
  PT: 'Portugalsko',
  GR: 'Řecko',
  MX: 'Mexiko',
  BR: 'Brazílie',
  NZ: 'Nový Zéland',
  HK: 'Hongkong',
  TW: 'Tchaj-wan'
};

function translateCountryName(isoCode: string, fallbackName: string): string {
  return COUNTRY_NAMES_CS[isoCode] || fallbackName;
}

function tmdbHeaders() {
  return {
    Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
    accept: 'application/json'
  };
}

export async function tmdbSearchMovie(query: string) {
  const url = `${TMDB_BASE}/search/multi?query=${encodeURIComponent(query)}&language=cs-CZ&include_adult=false`;
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) throw new Error('Vyhľadávanie na TMDb zlyhalo.');
  const data = await res.json();
  return (data.results || [])
    .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 10)
    .map((r: any) => ({
      id: r.id,
      mediaType: r.media_type,
      title: r.title || r.name,
      originalTitle: r.original_title || r.original_name,
      year: (r.release_date || r.first_air_date || '').slice(0, 4),
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w200${r.poster_path}` : null
    }));
}

export async function tmdbGetDetails(id: number, mediaType: 'movie' | 'tv') {
  const url = `${TMDB_BASE}/${mediaType}/${id}?language=cs-CZ&append_to_response=credits,keywords,images&include_image_language=null`;
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) throw new Error('Načítanie detailu z TMDb zlyhalo.');
  const d = await res.json();

  // Videá naťahujeme SAMOSTATNE, bez jazykového obmedzenia — pri filtrovaní podľa
  // cs-CZ by bol zoznam takmer vždy prázdny, keďže väčšina trailerov na TMDb je
  // vedená bez konkrétneho jazyka alebo v angličtine, nie po česky.
  const videosRes = await fetch(`${TMDB_BASE}/${mediaType}/${id}/videos`, { headers: tmdbHeaders() });
  const videosData = videosRes.ok ? await videosRes.json() : { results: [] };

  const crew = d.credits?.crew || [];
  const findCrew = (job: string) => crew.filter((c: any) => c.job === job).map((c: any) => c.name).join(', ');
  const cast = (d.credits?.cast || []).slice(0, 12).map((c: any) => c.name).join(', ');
  const videoResults = videosData.results || [];
  const trailer =
    videoResults.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
    videoResults.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') ||
    videoResults.find((v: any) => v.site === 'YouTube' && v.type === 'Teaser');

  // Kľúčové slová — TMDb ich (na rozdiel od ostatných polí) vracia len v angličtine,
  // nemajú český preklad k dispozícii cez API.
  const keywordList = mediaType === 'movie' ? d.keywords?.keywords : d.keywords?.results;
  const tags = (keywordList || []).slice(0, 10).map((k: any) => k.name).join(', ');

  // Fotky galérie — zábery z filmu (backdrops), zoradené podľa hodnotenia, max 8.
  const photoUrls = (d.images?.backdrops || [])
    .slice(0, 8)
    .map((img: any) => `https://image.tmdb.org/t/p/w1280${img.file_path}`);

  const originalTitleValue = d.original_title || d.original_name || '';
  const yearValue = (d.release_date || d.first_air_date || '').slice(0, 4);

  return {
    title: d.title || d.name || '',
    originalTitle: originalTitleValue,
    poster: d.poster_path ? `https://image.tmdb.org/t/p/w780${d.poster_path}` : null,
    genres: (d.genres || []).map((g: any) => g.name).join(', '),
    countries: (d.production_countries || []).map((c: any) => translateCountryName(c.iso_3166_1, c.name)).join(', '),
    year: yearValue,
    releaseDate: d.release_date || d.first_air_date || null,
    runtimeMinutes: d.runtime || (d.episode_run_time && d.episode_run_time[0]) || null,
    director: mediaType === 'movie' ? findCrew('Director') : findCrew('Series Director') || findCrew('Director'),
    screenplay: findCrew('Screenplay') || findCrew('Writer'),
    cinematography: findCrew('Director of Photography'),
    music: findCrew('Original Music Composer'),
    cast,
    synopsis: d.overview || '',
    tags,
    budget: mediaType === 'movie' && d.budget ? d.budget : null,
    boxOffice: mediaType === 'movie' && d.revenue ? d.revenue : null,
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
    trailerTitle: originalTitleValue && yearValue ? `${originalTitleValue} (${yearValue})` : undefined,
    photoUrls,
    tmdbId: d.id,
    tmdbMediaType: mediaType
  };
}

export async function tmdbGetLiveBoxOffice(tmdbId: number): Promise<{ budget: number | null; boxOffice: number | null } | null> {
  const url = `${TMDB_BASE}/movie/${tmdbId}`;
  const res = await fetch(url, { headers: tmdbHeaders(), next: { revalidate: 0 } });
  if (!res.ok) return null;
  const d = await res.json();
  return {
    budget: d.budget || null,
    boxOffice: d.revenue || null
  };
}

export async function tmdbSearchPerson(query: string) {
  const url = `${TMDB_BASE}/search/person?query=${encodeURIComponent(query)}&language=cs-CZ&include_adult=false`;
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) throw new Error('Vyhľadávanie na TMDb zlyhalo.');
  const data = await res.json();
  return (data.results || []).slice(0, 10).map((r: any) => ({
    id: r.id,
    name: r.name,
    knownForDepartment: r.known_for_department,
    photo: r.profile_path ? `https://image.tmdb.org/t/p/w200${r.profile_path}` : null,
    knownFor: (r.known_for || []).map((k: any) => k.title || k.name).filter(Boolean).slice(0, 3).join(', ')
  }));
}

export async function tmdbGetPersonDetails(id: number) {
  const url = `${TMDB_BASE}/person/${id}?language=cs-CZ`;
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) throw new Error('Načítanie detailu z TMDb zlyhalo.');
  const d = await res.json();

  // Ak TMDb nemá pre túto osobu český životopis preložený, vráti prázdny text —
  // v takom prípade skúsime ešte raz bez jazykového obmedzenia (spravidla anglicky),
  // nech políčko nezostane prázdne.
  let bio = d.biography || '';
  if (!bio) {
    const fallbackRes = await fetch(`${TMDB_BASE}/person/${id}`, { headers: tmdbHeaders() });
    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      bio = fallbackData.biography || '';
    }
  }

  return {
    name: d.name || '',
    role: d.known_for_department === 'Acting' ? 'ACTOR' : 'CREATOR',
    photo: d.profile_path ? `https://image.tmdb.org/t/p/w780${d.profile_path}` : null,
    bio,
    birthDate: d.birthday || null,
    deathDate: d.deathday || null,
    birthPlace: d.place_of_birth || '',
    tmdbId: d.id
  };
}

export async function tmdbGetPersonFilmography(tmdbId: number) {
  const url = `${TMDB_BASE}/person/${tmdbId}/combined_credits?language=cs-CZ`;
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) return { asActor: [], asCrew: [] };
  const d = await res.json();

  const dedupe = (items: any[]) => {
    const seen = new Set<number>();
    return items.filter((it) => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
  };

  const asActor = dedupe(d.cast || [])
    .sort((a: any, b: any) => (b.release_date || b.first_air_date || '').localeCompare(a.release_date || a.first_air_date || ''))
    .slice(0, 60)
    .map((c: any) => ({
      tmdbId: c.id,
      title: c.title || c.name,
      year: (c.release_date || c.first_air_date || '').slice(0, 4),
      character: c.character || null,
      poster: c.poster_path ? `https://image.tmdb.org/t/p/w92${c.poster_path}` : null
    }));

  const asCrew = dedupe(d.crew || [])
    .sort((a: any, b: any) => (b.release_date || b.first_air_date || '').localeCompare(a.release_date || a.first_air_date || ''))
    .slice(0, 60)
    .map((c: any) => ({
      tmdbId: c.id,
      title: c.title || c.name,
      year: (c.release_date || c.first_air_date || '').slice(0, 4),
      job: c.job || null,
      poster: c.poster_path ? `https://image.tmdb.org/t/p/w92${c.poster_path}` : null
    }));

  return { asActor, asCrew };
}

export async function tmdbGetTvSeasonsList(tvId: number): Promise<{ number: number; episodeCount: number; year: string }[]> {
  const url = `${TMDB_BASE}/tv/${tvId}?language=cs-CZ`;
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) return [];
  const d = await res.json();
  return (d.seasons || [])
    .filter((s: any) => s.season_number > 0) // vynechá "Speciály" (séria 0)
    .map((s: any) => ({
      number: s.season_number,
      episodeCount: s.episode_count || 0,
      year: (s.air_date || '').slice(0, 4)
    }));
}

export async function tmdbGetSeasonEpisodes(tvId: number, seasonNumber: number): Promise<{ number: number; title: string; synopsis: string }[]> {
  const url = `${TMDB_BASE}/tv/${tvId}/season/${seasonNumber}?language=cs-CZ`;
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) return [];
  const d = await res.json();
  return (d.episodes || []).map((e: any) => ({
    number: e.episode_number,
    title: e.name || '',
    synopsis: e.overview || ''
  }));
}
