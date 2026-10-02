import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { normalizeTitle } from '@/lib/fanFavorites';
import { findTmdbBySourceId, ensureMovieFromTmdb } from '@/lib/fanFavoritesImport';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Príjem poradia „Oblíbené mezi fanoušky“ od bota (GitHub Actions).
// GET                → stav (kedy bola posledná aktualizácia, či je čas na novú)
// POST               → { items: [{ sourceId, title, year }] } v poradí od 1. miesta;
//                      uloží poradie a spáruje tituly s databázou cez TMDb
// POST ?krok=import  → naimportuje ďalšie chýbajúce tituly (po niekoľkých,
//                      nech sa nepresiahne časový limit); bot volá, kým je čo
// Všetko chránené hlavičkou Authorization: Bearer <CRON_SECRET>.

const REFRESH_HOURS = 20;
const IMPORT_BATCH = 3;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
}

async function pendingCount() {
  return prisma.fanFavorite.count({ where: { movieId: null, tmdbId: { not: null }, importError: null } });
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const last = await prisma.fanFavorite.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } });
  const ageHours = last ? (Date.now() - last.updatedAt.getTime()) / 3_600_000 : null;
  return NextResponse.json({ updatedAt: last?.updatedAt ?? null, ageHours, due: ageHours === null || ageHours >= REFRESH_HOURS, pending: await pendingCount() });
}

async function importStep() {
  const rows = await prisma.fanFavorite.findMany({
    where: { movieId: null, tmdbId: { not: null }, importError: null },
    orderBy: { rank: 'asc' },
    take: IMPORT_BATCH
  });
  const imported: string[] = [];
  const failed: string[] = [];
  for (const r of rows) {
    try {
      const movieId = await ensureMovieFromTmdb(r.tmdbId!, r.mediaType === 'tv' ? 'tv' : 'movie');
      await prisma.fanFavorite.update({ where: { id: r.id }, data: { movieId } });
      imported.push(`${r.rank}. ${r.title}`);
    } catch (error: any) {
      console.error('[fan-favorites import]', r.title, error);
      await prisma.fanFavorite.update({ where: { id: r.id }, data: { importError: String(error?.message || 'chyba').slice(0, 300) } });
      failed.push(`${r.rank}. ${r.title}`);
    }
  }
  if (imported.length) revalidateTag('fan-favorites', 'max');
  return { imported, failed, pending: await pendingCount() };
}

type Incoming = { sourceId: string; title: string; year: number | null };

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  if (url.searchParams.get('krok') === 'import') {
    try {
      return NextResponse.json({ ok: true, ...(await importStep()) });
    } catch (error) {
      console.error('[api/cron/fan-favorites import]', error);
      return NextResponse.json({ error: 'Import zlyhal.' }, { status: 500 });
    }
  }

  try {
    const body = await req.json().catch(() => ({}));
    const raw: any[] = Array.isArray(body?.items) ? body.items : [];
    const items: Incoming[] = raw
      .map((i) => ({
        sourceId: String(i?.sourceId || '').slice(0, 32),
        title: String(i?.title || '').slice(0, 300).trim(),
        year: Number.isFinite(Number(i?.year)) && Number(i?.year) > 1800 ? Number(i.year) : null
      }))
      .filter((i) => /^tt\d{6,10}$/.test(i.sourceId) && i.title);
    const unique = Array.from(new Map(items.map((i) => [i.sourceId, i])).values()).slice(0, 50);
    if (unique.length < 5) return NextResponse.json({ error: 'Príliš málo titulov, nič sa neuložilo.' }, { status: 400 });

    // 1) TMDb id pre každý titul (po 6 naraz)
    const found: ({ tmdbId: number; mediaType: 'movie' | 'tv' } | null)[] = [];
    for (let i = 0; i < unique.length; i += 6) {
      const chunk = await Promise.all(unique.slice(i, i + 6).map((it) => findTmdbBySourceId(it.sourceId).catch(() => null)));
      found.push(...chunk);
    }

    // 2) Existujúce filmy podľa TMDb id
    const tmdbIds = found.filter(Boolean).map((f) => f!.tmdbId);
    const byTmdb = tmdbIds.length
      ? await prisma.movie.findMany({ where: { tmdbId: { in: tmdbIds } }, select: { id: true, tmdbId: true, contentType: true } })
      : [];

    // 3) Záloha: podľa názvu a roku (keď TMDb nič nenašiel)
    const years = Array.from(new Set(unique.flatMap((i) => (i.year ? [i.year - 1, i.year, i.year + 1] : [])))).map(String);
    const candidates = years.length
      ? await prisma.movie.findMany({ where: { approved: true, year: { in: years } }, select: { id: true, title: true, originalTitle: true, year: true } })
      : [];

    const used = new Set<string>();
    const rows = unique.map((item, index) => {
      const f = found[index];
      let movieId: string | null = null;
      if (f) {
        const ct = f.mediaType === 'tv' ? 'Seriál' : 'Film';
        const hit = byTmdb.find((m) => m.tmdbId === f.tmdbId && m.contentType === ct) || byTmdb.find((m) => m.tmdbId === f.tmdbId);
        if (hit && !used.has(hit.id)) movieId = hit.id;
      } else {
        const want = normalizeTitle(item.title);
        const hit = candidates.find((m) => {
          if (used.has(m.id)) return false;
          const y = parseInt(m.year || '', 10);
          if (item.year && (!Number.isFinite(y) || Math.abs(y - item.year) > 1)) return false;
          return normalizeTitle(m.originalTitle || '') === want || normalizeTitle(m.title) === want;
        });
        if (hit) movieId = hit.id;
      }
      if (movieId) used.add(movieId);
      return {
        rank: index + 1,
        sourceId: item.sourceId,
        title: item.title,
        year: item.year,
        tmdbId: f?.tmdbId ?? null,
        mediaType: f?.mediaType ?? null,
        movieId
      };
    });

    const now = new Date();
    await prisma.$transaction([
      prisma.fanFavorite.deleteMany({}),
      prisma.fanFavorite.createMany({ data: rows.map((r) => ({ ...r, updatedAt: now })) })
    ]);
    revalidateTag('fan-favorites', 'max');

    const unresolved = rows.filter((r) => !r.movieId && !r.tmdbId).map((r) => `${r.rank}. ${r.title}${r.year ? ` (${r.year})` : ''}`);
    return NextResponse.json({
      ok: true,
      saved: rows.length,
      matched: rows.filter((r) => r.movieId).length,
      pending: rows.filter((r) => !r.movieId && r.tmdbId).length,
      unresolved
    });
  } catch (error) {
    console.error('[api/cron/fan-favorites]', error);
    return NextResponse.json({ error: 'Uloženie zlyhalo.' }, { status: 500 });
  }
}
