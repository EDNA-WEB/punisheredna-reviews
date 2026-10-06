// Výkon – 2. kolo. Spustenie: node scripts\vykon2-setup.mjs
// Skript je idempotentný – opakované spustenie nič nepokazí.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = (p) => path.join(root, p);
let problems = 0;

function patch(rel, marker, fn) {
  const p = file(rel);
  if (!fs.existsSync(p)) {
    console.log(`CHYBA  ${rel} – súbor neexistuje`);
    problems++;
    return;
  }
  const src = fs.readFileSync(p, 'utf8');
  if (src.includes(marker)) {
    console.log(`OK     ${rel} – už upravené`);
    return;
  }
  const out = fn(src);
  if (!out || out === src) {
    console.log(`CHYBA  ${rel} – nenašiel som miesto na úpravu (pošli mi tento súbor)`);
    problems++;
    return;
  }
  fs.writeFileSync(p, out);
  console.log(`HOTOVO ${rel}`);
}

// 1) Settings – krátka cache v pamäti (60 s), zmena nastavení ju hneď vymaže.
patch('lib/prisma.ts', 'withSettingsCache', (src) => {
  const re = /function createPrismaClient\(\) \{\s*const base = new PrismaClient\(\);\s*return base\.\$extends\(\{/;
  if (!re.test(src)) return null;
  let out = src.replace(
    re,
    `function createPrismaClient() {
  return withSettingsCache(createMeasuredClient());
}

function createMeasuredClient() {
  const base = new PrismaClient();
  return base.$extends({`
  );
  out += `
// Výkon: tabuľka Settings (jeden riadok s nastaveniami webu) sa čítala pri
// každom zobrazení stránky – na /login aj tisíckrát za deň. Čítanie sa teraz
// pamätá 60 sekúnd v rámci inštancie servera. Akýkoľvek zápis do Settings
// pamäť okamžite vymaže, takže admin vidí zmenu hneď; ostatné inštancie
// najneskôr do minúty.
const SETTINGS_TTL_MS = 60_000;
const SETTINGS_READS = new Set(['findUnique', 'findFirst', 'findUniqueOrThrow', 'findFirstOrThrow']);
const settingsCache: Map<string, { at: number; value: Promise<unknown> }> =
  ((globalThis as any).__settingsCache ||= new Map());

function withSettingsCache(client: ReturnType<typeof createMeasuredClient>) {
  return client.$extends({
    query: {
      settings: {
        async $allOperations({ operation, args, query }) {
          if (!SETTINGS_READS.has(operation)) {
            settingsCache.clear();
            try {
              return await query(args);
            } finally {
              settingsCache.clear();
            }
          }
          const key = operation + ':' + JSON.stringify(args ?? {});
          const now = Date.now();
          const hit = settingsCache.get(key);
          if (hit && now - hit.at < SETTINGS_TTL_MS) return hit.value as any;
          const value = Promise.resolve(query(args));
          settingsCache.set(key, { at: now, value });
          value.catch(() => {
            if (settingsCache.get(key)?.value === value) settingsCache.delete(key);
          });
          return value;
        }
      }
    }
  });
}
`;
  return out;
});

// 2) Štatistiky webu (počet filmov, česky, online) – jeden súčtový SQL dopyt
//    namiesto sťahovania dejov všetkých filmov (to trvalo 1 až 12 sekúnd).
patch('lib/cachedMovieData.ts', 'site-stats-panel-v2', (src) => {
  const re = /export const getCachedSiteStats = unstable_cache\([\s\S]*?\['site-stats-panel'\],\s*\{ revalidate: 1800 \}\s*\);/;
  if (!re.test(src)) return null;
  return src.replace(
    re,
    `export const getCachedSiteStats = unstable_cache(
  async () => {
    // Výkon: počíta priamo databáza (predtým sa sťahovali deje všetkých filmov).
    const rows = await prisma.$queryRaw<{ total: number; czech: number; online: number }[]>\`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE m."synopsis" ~ '[řěůŘĚŮ]')::int AS czech,
        COUNT(*) FILTER (
          WHERE (m."watchUrl" IS NOT NULL AND m."watchUrl" <> '')
             OR EXISTS (
               SELECT 1 FROM "Season" s
               JOIN "Episode" e ON e."seasonId" = s."id"
               WHERE s."movieId" = m."id" AND e."onlineUrl" IS NOT NULL AND e."onlineUrl" <> ''
             )
        )::int AS online
      FROM "Movie" m
      WHERE m."approved" = true\`;
    const r = rows[0];
    return {
      totalMovies: Number(r?.total ?? 0),
      czechCount: Number(r?.czech ?? 0),
      onlineCount: Number(r?.online ?? 0)
    };
  },
  ['site-stats-panel-v2'],
  { revalidate: 1800 }
);`
  );
});

// 3) Katalóg filtra (/recenzie, /api/movie-filter) – zdieľaný medzi všetkými
//    inštanciami servera po menších častiach. Nová inštancia už nečaká
//    3 sekundy na celý katalóg z databázy.
patch('lib/movieFilter.ts', 'movie-filter-chunk-v1', (src) => {
  const re =
    /async function loadCatalog\(\): Promise<CatalogMovie\[\]> \{\s*const \[rows, agg\] = await Promise\.all\(\[\s*prisma\.movie\.findMany\(\{\s*where: \{ approved: true \},\s*select: (\{[\s\S]*?\n\s*\})\s*\}\),\s*getCatalogAggregates\(\)\s*\]\);/;
  const m = src.match(re);
  if (!m) return null;
  const select = m[1];
  let out = src.replace(
    re,
    `// Výkon: katalóg je príliš veľký na jednu položku zdieľanej cache (limit
// 2 MB), preto sa ukladá po častiach. Inštancia servera si ho tak poskladá
// z cache za zlomok sekundy namiesto ťahania celej filmotéky z databázy.
const CATALOG_CHUNK = 250;

const getCatalogCount = unstable_cache(
  () => prisma.movie.count({ where: { approved: true } }),
  ['movie-filter-count-v1'],
  { revalidate: 900, tags: ['movie-filter'] }
);

const getCatalogChunk = unstable_cache(
  async (index: number) => {
    const rows = await prisma.movie.findMany({
      where: { approved: true },
      orderBy: { id: 'asc' },
      skip: index * CATALOG_CHUNK,
      take: CATALOG_CHUNK,
      select: ${select}
    });
    return rows.map((m) => ({
      ...m,
      releaseDate: m.releaseDate ? new Date(m.releaseDate).toISOString() : null,
      createdAt: new Date(m.createdAt).getTime(),
      boxOffice: m.boxOffice ? Number(m.boxOffice) : 0
    }));
  },
  ['movie-filter-chunk-v1'],
  { revalidate: 900, tags: ['movie-filter'] }
);

async function loadCatalog(): Promise<CatalogMovie[]> {
  const [total, agg] = await Promise.all([getCatalogCount(), getCatalogAggregates()]);
  // +1 časť navyše pre filmy pridané od posledného spočítania.
  const chunkCount = Math.ceil(total / CATALOG_CHUNK) + 1;
  const chunks = await Promise.all(Array.from({ length: chunkCount }, (_, i) => getCatalogChunk(i)));
  const seen = new Set<string>();
  const rows = chunks.flat().filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });`
  );
  out = out
    .replace('releaseDate: m.releaseDate ? m.releaseDate.toISOString() : null,\n      createdAt: m.createdAt.getTime(),', 'releaseDate: m.releaseDate,\n      createdAt: m.createdAt,');
  if (!out.includes('releaseDate: m.releaseDate,\n      createdAt: m.createdAt,')) return null;
  return out;
});

// 4) Kontrola: iné miesta, ktoré ťahajú deje všetkých filmov.
for (const dir of ['components', 'app', 'lib']) {
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) {
        const s = fs.readFileSync(p, 'utf8');
        if (/select:\s*\{\s*synopsis: true,\s*watchUrl: true/.test(s)) {
          console.log(`POZOR  ${path.relative(root, p)} – ešte ťahá deje všetkých filmov (pošli mi tento súbor)`);
        }
      }
    }
  };
  walk(file(dir));
}

console.log(problems ? `\nHotovo s chybami: ${problems}. Pošli mi výpis.` : '\nVšetko upravené.');
