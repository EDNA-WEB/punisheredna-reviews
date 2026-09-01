// Pomocné funkcie na komunikáciu s oficiálnym TMDb API (themoviedb.org).
// Dáta sa zobrazujú s uvedením zdroja "Zdroj dát: TMDb", presne v súlade s ich podmienkami používania.


const TMDB_BASE = 'https://api.themoviedb.org/3';

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
  const url = `${TMDB_BASE}/${mediaType}/${id}?language=cs-CZ&append_to_response=credits,videos,keywords,images&include_image_language=null`;
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) throw new Error('Načítanie detailu z TMDb zlyhalo.');
  const d = await res.json();

  const crew = d.credits?.crew || [];
  const findCrew = (job: string) => crew.filter((c: any) => c.job === job).map((c: any) => c.name).join(', ');
  const cast = (d.credits?.cast || []).slice(0, 12).map((c: any) => c.name).join(', ');
  const trailer = (d.videos?.results || []).find((v: any) => v.site === 'YouTube' && v.type === 'Trailer');

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
    countries: (d.production_countries || []).map((c: any) => c.name).join(', '),
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
    photoUrls
  };
}
