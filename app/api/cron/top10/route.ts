import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { findTmdbBySourceId, ensureMovieFromTmdb } from '@/lib/fanFavoritesImport';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Príjem rebríčka „Top 10 tento týden“ od bota (GitHub Actions, raz za 24 h).
// GET               → stav (posledná aktualizácia, či je čas na novú)
// POST              → { items: [{ sourceId, title, year }] } od 1. miesta
// POST ?krok=import → doplní chýbajúce tituly z TMDb (po 3)
// Chránené hlavičkou Authorization: Bearer <CRON_SECRET>.

const REFRESH_HOURS = 24;
const IMPORT_BATCH = 3;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
}

const pendingCount = () => prisma.top10Entry.count({ where: { movieId: null, tmdbId: { not: null }, importError: null } });

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const last = await prisma.top10Entry.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } });
  const ageHours = last ? (Date.now() - last.updatedAt.getTime()) / 3_600_000 : null;
  // 1 h rezerva, nech denný beh nevynechá deň len preto, že prišiel o pár minút skôr
  return NextResponse.json({ updatedAt: last?.updatedAt ?? null, ageHours, due: ageHours === null || ageHours >= REFRESH_HOURS - 1, pending: await pendingCount() });
}

async function importStep() {
  const rows = await prisma.top10Entry.findMany({ where: { movieId: null, tmdbId: { not: null }, importError: null }, orderBy: { rank: 'asc' }, take: IMPORT_BATCH });
  const imported: string[] = [];
  const failed: string[] = [];
  for (const r of rows) {
    try {
      const movieId = await ensureMovieFromTmdb(r.tmdbId!, r.mediaType === 'tv' ? 'tv' : 'movie');
      await prisma.top10Entry.update({ where: { id: r.id }, data: { movieId } });
      imported.push(`${r.rank}. ${r.title}`);
    } catch (error: any) {
      console.error('[top10 import]', r.title, error);
      await prisma.top10Entry.update({ where: { id: r.id }, data: { importError: String(error?.message || 'chyba').slice(0, 300) } });
      failed.push(`${r.rank}. ${r.title}`);
    }
  }
  if (imported.length) revalidateTag('top10', 'max');
  return { imported, failed, pending: await pendingCount() };
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (new URL(req.url).searchParams.get('krok') === 'import') {
    try {
      return NextResponse.json({ ok: true, ...(await importStep()) });
    } catch (error) {
      console.error('[api/cron/top10 import]', error);
      return NextResponse.json({ error: 'Import zlyhal.' }, { status: 500 });
    }
  }

  try {
    const body = await req.json().catch(() => ({}));
    const raw: any[] = Array.isArray(body?.items) ? body.items : [];
    const items = raw
      .map((i) => ({
        sourceId: String(i?.sourceId || '').slice(0, 32),
        title: String(i?.title || '').slice(0, 300).trim(),
        year: Number.isFinite(Number(i?.year)) && Number(i?.year) > 1800 ? Number(i.year) : null
      }))
      .filter((i) => /^tt\d{6,10}$/.test(i.sourceId) && i.title);
    const unique = Array.from(new Map(items.map((i) => [i.sourceId, i])).values()).slice(0, 15);
    if (unique.length < 5) return NextResponse.json({ error: 'Príliš málo titulov, nič sa neuložilo.' }, { status: 400 });

    const found = await Promise.all(unique.map((it) => findTmdbBySourceId(it.sourceId).catch(() => null)));
    const tmdbIds = found.filter(Boolean).map((f) => f!.tmdbId);
    const existing = tmdbIds.length
      ? await prisma.movie.findMany({ where: { tmdbId: { in: tmdbIds } }, select: { id: true, tmdbId: true, contentType: true } })
      : [];

    const used = new Set<string>();
    const rows = unique.map((item, index) => {
      const f = found[index];
      let movieId: string | null = null;
      if (f) {
        const ct = f.mediaType === 'tv' ? 'Seriál' : 'Film';
        const hit = existing.find((m) => m.tmdbId === f.tmdbId && m.contentType === ct) || existing.find((m) => m.tmdbId === f.tmdbId);
        if (hit && !used.has(hit.id)) movieId = hit.id;
      }
      if (movieId) used.add(movieId);
      return { rank: index + 1, sourceId: item.sourceId, title: item.title, year: item.year, tmdbId: f?.tmdbId ?? null, mediaType: f?.mediaType ?? null, movieId };
    });

    const now = new Date();
    await prisma.$transaction([prisma.top10Entry.deleteMany({}), prisma.top10Entry.createMany({ data: rows.map((r) => ({ ...r, updatedAt: now })) })]);
    revalidateTag('top10', 'max');

    return NextResponse.json({
      ok: true,
      saved: rows.length,
      matched: rows.filter((r) => r.movieId).length,
      pending: rows.filter((r) => !r.movieId && r.tmdbId).length,
      unresolved: rows.filter((r) => !r.tmdbId).map((r) => `${r.rank}. ${r.title}`)
    });
  } catch (error) {
    console.error('[api/cron/top10]', error);
    return NextResponse.json({ error: 'Uloženie zlyhalo.' }, { status: 500 });
  }
}
