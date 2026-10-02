import { prisma } from './prisma';
import { tmdbGetDetails } from './tmdb';

// ---------------------------------------------------------------------------
// Doplnenie titulov pre „Oblíbené mezi fanoušky“: identifikátor zo zdroja →
// TMDb → film v našej databáze. Titul, ktorý ešte nemáme, sa naimportuje
// z TMDb automaticky (český názov, plagát, popis, tvorcovia, herci, trailer,
// fotky), rovnako ako pri ručnom importe v administrácii.
// ---------------------------------------------------------------------------

const TMDB_BASE = 'https://api.themoviedb.org/3';

function headers() {
  return { Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`, accept: 'application/json' };
}

// Identifikátor zo zdroja (napr. tt1234567) → TMDb id a typ (film/seriál).
export async function findTmdbBySourceId(sourceId: string): Promise<{ tmdbId: number; mediaType: 'movie' | 'tv' } | null> {
  const res = await fetch(`${TMDB_BASE}/find/${encodeURIComponent(sourceId)}?external_source=imdb_id`, { headers: headers(), cache: 'no-store' });
  if (!res.ok) return null;
  const d = await res.json();
  const movie = d.movie_results?.[0];
  if (movie?.id) return { tmdbId: movie.id, mediaType: 'movie' };
  const tv = d.tv_results?.[0];
  if (tv?.id) return { tmdbId: tv.id, mediaType: 'tv' };
  return null;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'film';
}

async function uniqueSlug(title: string, year: string) {
  const base = slugify(title);
  const candidates = [base, year ? `${base}-${year}` : null].filter(Boolean) as string[];
  for (const c of candidates) {
    if (!(await prisma.movie.findUnique({ where: { slug: c }, select: { id: true } }))) return c;
  }
  for (let i = 2; i < 50; i++) {
    const c = `${base}${year ? `-${year}` : ''}-${i}`;
    if (!(await prisma.movie.findUnique({ where: { slug: c }, select: { id: true } }))) return c;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// Vráti id filmu v databáze — existujúceho (podľa TMDb id) alebo novo
// naimportovaného.
export async function ensureMovieFromTmdb(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<string> {
  const contentType = mediaType === 'tv' ? 'Seriál' : 'Film';
  const existing = await prisma.movie.findFirst({
    where: { tmdbId, contentType },
    select: { id: true }
  });
  if (existing) return existing.id;

  const d = await tmdbGetDetails(tmdbId, mediaType);
  const slug = await uniqueSlug(d.title || d.originalTitle, d.year);

  const movie = await prisma.movie.create({
    data: {
      title: d.title || d.originalTitle,
      originalTitle: d.originalTitle || null,
      slug,
      poster: d.poster,
      genres: d.genres || null,
      countries: d.countries || null,
      year: d.year || null,
      releaseDate: d.releaseDate ? new Date(d.releaseDate) : null,
      runtimeMinutes: d.runtimeMinutes || null,
      director: d.director || null,
      screenplay: d.screenplay || null,
      cinematography: d.cinematography || null,
      music: d.music || null,
      cast: d.cast || null,
      synopsis: d.synopsis || null,
      tags: d.tags || null,
      budget: d.budget ?? null,
      boxOffice: d.boxOffice ?? null,
      trailerUrl: d.trailerUrl || null,
      contentType,
      tmdbId: d.tmdbId,
      approved: true
    },
    select: { id: true }
  });

  if (d.trailerUrl) {
    await prisma.movieVideo.create({
      data: { movieId: movie.id, url: d.trailerUrl, category: 'trailer', title: d.trailerTitle || null }
    });
  }
  if (d.photoUrls?.length) {
    await prisma.moviePhoto.createMany({
      data: d.photoUrls.map((full: string, order: number) => ({
        movieId: movie.id,
        full,
        thumbnail: full.replace('/w1280/', '/w500/'),
        order
      }))
    });
  }
  return movie.id;
}
