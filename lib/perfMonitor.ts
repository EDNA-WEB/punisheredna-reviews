import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Monitoring záťaže databázy (Neon účtuje "compute hours" = čas, kedy je
// databáza prebudená × jej veľkosť). Každý Prisma dopyt sa tu zaráta:
//   • ODKIAĽ prišiel (stránka / API route — zistené zo zásobníka volaní),
//   • nad čím (model + operácia), koľko trval.
// Dáta sa NEzapisujú pri každom dopyte (to by samo zvyšovalo záťaž), ale
// držia sa v pamäti a raz za minútu sa jedným hromadným zápisom uložia —
// vždy len vtedy, keď je databáza aj tak práve hore (nikdy ju nezobudí).
// Vypnutie: premenná prostredia PERF_MONITOR=off.
// ---------------------------------------------------------------------------

export const PERF_ENABLED = process.env.PERF_MONITOR !== 'off';
const FLUSH_EVERY_MS = 60_000;
const IGNORED_SOURCES = ['/admin/vykon', '/api/admin/vykon']; // dashboard nemeria sám seba

type Bucket = { hour: Date; source: string; model: string; action: string; count: number; totalMs: number; maxMs: number };
type Minute = { minute: Date; queries: number; totalMs: number };
type PerfState = { buckets: Map<string, Bucket>; minutes: Map<number, Minute>; lastFlush: number; flushing: boolean };

const g = globalThis as unknown as { __perfState?: PerfState };
const state: PerfState = g.__perfState || (g.__perfState = { buckets: new Map(), minutes: new Map(), lastFlush: Date.now(), flushing: false });

// Z textu zásobníka vytiahne, ktorá stránka/route dopyt spustila.
// Príklad rámca na Verceli: /var/task/.next/server/app/api/mobile/messages/typing/route.js
export function sourceFromStack(stack: string | undefined): string {
  if (!stack) return 'neznámy';
  const m = stack.match(/[\\/]app((?:[\\/][^\\/\s:]+)*?)[\\/](route|page|layout)\.(?:js|jsx|ts|tsx)/);
  if (m) {
    const path = m[1]
      .replace(/\\/g, '/')
      .replace(/\/\([^/]+\)/g, '') // (skupiny) v App Routeri nie sú súčasť URL
      .replace(/\/@[^/]+/g, '');
    return (path || '/') + (m[2] === 'route' ? '' : ' (stránka)');
  }
  const lib = stack.match(/[\\/](lib|components)[\\/]([\w.-]+)\.(?:js|ts|tsx)/);
  if (lib) return `${lib[1]}/${lib[2]}`;
  return 'neznámy';
}

// ---------------------------------------------------------------------------
// Záložné určenie zdroja: serverové stránky (React Server Components) a
// cachované funkcie sa vykresľujú mimo pôvodného zásobníka volaní, preto ich
// zásobník neprezradí. Next.js však počas každej požiadavky drží cestu URL vo
// svojom internom úložisku — odtiaľ ju len prečítame (bez vedľajších účinkov,
// stránka kvôli tomu nezmení spôsob vykresľovania). Ak by sa vnútro Next.js
// v budúcnosti zmenilo, jednoducho sa vráti null a použije sa "neznámy".
// ---------------------------------------------------------------------------
let nextStorage: any = undefined;
function getNextStore(): any {
  if (nextStorage === null) return null;
  try {
    if (nextStorage === undefined) {
      // eslint-disable-next-line no-eval
      const req = eval('require');
      try {
        nextStorage = req('next/dist/client/components/static-generation-async-storage.external.js').staticGenerationAsyncStorage;
      } catch {
        nextStorage = req('next/dist/server/app-render/work-async-storage.external.js').workAsyncStorage; // Next 15+
      }
    }
    return nextStorage?.getStore?.() || null;
  } catch {
    nextStorage = null;
    return null;
  }
}

// Dynamické časti URL zlúčime, aby sa /movie/duna a /movie/vetrelec-zeme
// počítali spolu ako /movie/[slug].
const DYNAMIC_AFTER: Record<string, string> = {
  movie: '[slug]',
  news: '[slug]',
  osobnost: '[slug]',
  profile: '[id]',
  messages: '[userId]',
  diskusie: '[id]',
  'qr-prihlasenie': '[id]',
  sezona: '[n]',
  epizoda: '[n]'
};
export function normalizePath(path: string) {
  const parts = path.split('?')[0].split('/').filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    const prev = parts[i - 1];
    if (prev && DYNAMIC_AFTER[prev]) out.push(DYNAMIC_AFTER[prev]);
    else if (/^\d+$/.test(seg) || /^c[a-z0-9]{20,}$/.test(seg) || /^[0-9a-f-]{32,36}$/i.test(seg)) out.push('[id]');
    else out.push(seg);
  }
  return '/' + out.join('/');
}

export function sourceFromNext(): string | null {
  const store = getNextStore();
  if (!store) return null;
  const route: string | undefined = store.route || store.urlPathname;
  if (!route) return null;
  const path = store.route ? route : normalizePath(route);
  return `${path}${store.isUnstableCacheCallback ? ' (cache)' : ' (stránka)'}`;
}

export function recordQuery(source: string, model: string, action: string, ms: number) {
  if (IGNORED_SOURCES.some((s) => source.startsWith(s))) return;
  const now = Date.now();
  const hour = new Date(Math.floor(now / 3_600_000) * 3_600_000);
  const key = `${hour.getTime()}|${source}|${model}|${action}`;
  const b = state.buckets.get(key);
  if (b) {
    b.count += 1;
    b.totalMs += ms;
    if (ms > b.maxMs) b.maxMs = ms;
  } else {
    state.buckets.set(key, { hour, source, model, action, count: 1, totalMs: ms, maxMs: ms });
  }
  const minuteTs = Math.floor(now / 60_000) * 60_000;
  const mm = state.minutes.get(minuteTs);
  if (mm) {
    mm.queries += 1;
    mm.totalMs += ms;
  } else {
    state.minutes.set(minuteTs, { minute: new Date(minuteTs), queries: 1, totalMs: ms });
  }
}

type RawClient = { $executeRawUnsafe: (query: string, ...values: any[]) => Promise<number> };

export function shouldFlush() {
  return PERF_ENABLED && !state.flushing && Date.now() - state.lastFlush > FLUSH_EVERY_MS && (state.buckets.size > 0 || state.minutes.size > 0);
}

// Hromadný zápis — 2 SQL príkazy bez ohľadu na počet zaznamenaných dopytov.
export async function flushPerf(client: RawClient) {
  if (state.flushing) return;
  state.flushing = true;
  const buckets = Array.from(state.buckets.values());
  const minutes = Array.from(state.minutes.values());
  state.buckets = new Map();
  state.minutes = new Map();
  state.lastFlush = Date.now();
  try {
    if (buckets.length) {
      const values: any[] = [];
      const rows = buckets.map((b, i) => {
        const o = i * 8;
        values.push(randomUUID(), b.hour, b.source.slice(0, 190), b.model, b.action, b.count, b.totalMs, b.maxMs);
        return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8})`;
      });
      await client.$executeRawUnsafe(
        `INSERT INTO "PerfStat" ("id","hour","source","model","action","count","totalMs","maxMs") VALUES ${rows.join(',')}
         ON CONFLICT ("hour","source","model","action") DO UPDATE SET
           "count" = "PerfStat"."count" + EXCLUDED."count",
           "totalMs" = "PerfStat"."totalMs" + EXCLUDED."totalMs",
           "maxMs" = GREATEST("PerfStat"."maxMs", EXCLUDED."maxMs")`,
        ...values
      );
    }
    if (minutes.length) {
      const values: any[] = [];
      const rows = minutes.map((m, i) => {
        const o = i * 3;
        values.push(m.minute, m.queries, m.totalMs);
        return `($${o + 1}, $${o + 2}, $${o + 3})`;
      });
      await client.$executeRawUnsafe(
        `INSERT INTO "PerfMinute" ("minute","queries","totalMs") VALUES ${rows.join(',')}
         ON CONFLICT ("minute") DO UPDATE SET
           "queries" = "PerfMinute"."queries" + EXCLUDED."queries",
           "totalMs" = "PerfMinute"."totalMs" + EXCLUDED."totalMs"`,
        ...values
      );
    }
    // Občas upratať staré dáta (staršie ako 30 dní).
    if (Math.random() < 0.02) {
      await client.$executeRawUnsafe(`DELETE FROM "PerfStat" WHERE "hour" < NOW() - INTERVAL '30 days'`);
      await client.$executeRawUnsafe(`DELETE FROM "PerfMinute" WHERE "minute" < NOW() - INTERVAL '30 days'`);
    }
  } catch (e) {
    // Monitoring nikdy nesmie zhodiť web. (Napr. pred "prisma db push" tabuľky ešte neexistujú.)
    console.error('[perfMonitor] flush zlyhal', (e as any)?.message);
  } finally {
    state.flushing = false;
  }
}
