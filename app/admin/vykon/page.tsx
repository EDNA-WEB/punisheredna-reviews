import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminTabs from '@/components/AdminTabs';
import PerfAdminActions from '@/components/PerfAdminActions';
import { PERF_ENABLED } from '@/lib/perfMonitor';

export const dynamic = 'force-dynamic';

// Neon "Launch": $4.36 za 41.44 compute hours → ~0,105 $ za CU-hodinu.
const PRICE_PER_CU_HOUR = 0.105;
// Neon uspí databázu až 5 minút po poslednom dopyte.
const SUSPEND_AFTER_MIN = 5;

const RANGES = [
  { key: '1', label: '24 hodin', hours: 24 },
  { key: '7', label: '7 dní', hours: 24 * 7 },
  { key: '30', label: '30 dní', hours: 24 * 30 }
];

function fmtNum(n: number) {
  return new Intl.NumberFormat('sk-SK').format(Math.round(n));
}
function fmtMs(ms: number) {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)} min`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${ms.toFixed(ms < 10 ? 1 : 0)} ms`;
}
function fmtHours(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

// Z minút s aktivitou odhadne, koľko minút bola databáza hore:
// každá aktívna minúta ju drží prebudenú ešte ďalších 5 minút.
function awakeMinutes(minuteTimestamps: number[]) {
  const sorted = [...minuteTimestamps].sort((a, b) => a - b);
  let total = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const t of sorted) {
    const start = t;
    const end = t + (1 + SUSPEND_AFTER_MIN) * 60_000;
    if (start > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = start;
      curEnd = end;
    } else if (end > curEnd) {
      curEnd = end;
    }
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return total / 60_000;
}

type Severity = 'critical' | 'warning' | 'info';

export default async function AdminPerfPage({ searchParams }: { searchParams?: { rozsah?: string; cu?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const range = RANGES.find((r) => r.key === searchParams?.rozsah) || RANGES[0];
  const cu = Math.min(16, Math.max(0.25, parseFloat(searchParams?.cu || '0.25') || 0.25));
  const since = new Date(Date.now() - range.hours * 3_600_000);

  let tablesMissing = false;
  let stats: { source: string; model: string; action: string; count: number; totalMs: number; maxMs: number; hours: number }[] = [];
  let minutes: { minute: Date; queries: number; totalMs: number }[] = [];
  try {
    const [rawStats, rawMinutes] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        `SELECT "source","model","action", SUM("count")::int AS "count", SUM("totalMs")::float AS "totalMs",
                MAX("maxMs")::float AS "maxMs", COUNT(DISTINCT "hour")::int AS "hours"
         FROM "PerfStat" WHERE "hour" >= $1 GROUP BY "source","model","action"`,
        new Date(Math.floor(since.getTime() / 3_600_000) * 3_600_000)
      ),
      prisma.$queryRawUnsafe<any[]>(`SELECT "minute","queries","totalMs" FROM "PerfMinute" WHERE "minute" >= $1 ORDER BY "minute" ASC`, since)
    ]);
    stats = rawStats;
    minutes = rawMinutes;
  } catch {
    tablesMissing = true;
  }

  // pg_stat_statements — štatistika priamo zo servera databázy (ak je zapnutá).
  let pgss: { query: string; calls: number; total: number; mean: number; rows: number }[] | null = null;
  let pgssError: string | null = null;
  try {
    pgss = await prisma.$queryRawUnsafe<any[]>(
      `SELECT query, calls::int AS calls, total_exec_time::float AS total, mean_exec_time::float AS mean, rows::int AS rows
       FROM pg_stat_statements
       WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
         AND query NOT ILIKE '%pg_stat_statements%' AND query NOT ILIKE '%"Perf%'
       ORDER BY total_exec_time DESC LIMIT 15`
    );
  } catch (e: any) {
    pgssError = e?.message || 'nedostupné';
  }

  // ---- Súhrny -------------------------------------------------------------
  const totalQueries = stats.reduce((n, s) => n + s.count, 0);
  const totalDbMs = stats.reduce((n, s) => n + s.totalMs, 0);
  const awakeMin = awakeMinutes(minutes.map((m) => new Date(m.minute).getTime()));
  const rangeMin = range.hours * 60;
  const awakePct = Math.min(100, (awakeMin / rangeMin) * 100);
  const estCost = (awakeMin / 60) * cu * PRICE_PER_CU_HOUR;
  const monthlyProjection = range.hours > 0 ? estCost * ((30 * 24) / range.hours) : 0;

  const bySource = new Map<string, { source: string; count: number; totalMs: number; maxMs: number; writes: number; hours: number }>();
  for (const s of stats) {
    const cur = bySource.get(s.source) || { source: s.source, count: 0, totalMs: 0, maxMs: 0, writes: 0, hours: 0 };
    cur.count += s.count;
    cur.totalMs += s.totalMs;
    cur.maxMs = Math.max(cur.maxMs, s.maxMs);
    cur.hours = Math.max(cur.hours, s.hours);
    if (/^(create|update|upsert|delete|createMany|updateMany|deleteMany)/.test(s.action)) cur.writes += s.count;
    bySource.set(s.source, cur);
  }
  const sources = Array.from(bySource.values());
  const topByCount = [...sources].sort((a, b) => b.count - a.count).slice(0, 25);
  const topModels = [...stats].sort((a, b) => b.totalMs - a.totalMs).slice(0, 20);

  // ---- Posledných 24 hodín po hodinách: koľko minút bola DB hore ----------
  const now = Date.now();
  const hourBars = Array.from({ length: 24 }, (_, i) => {
    const hStart = Math.floor(now / 3_600_000) * 3_600_000 - (23 - i) * 3_600_000;
    const inHour = minutes
      .map((m) => new Date(m.minute).getTime())
      .filter((t) => t >= hStart - SUSPEND_AFTER_MIN * 60_000 && t < hStart + 3_600_000);
    // presný prienik prebudených intervalov s danou hodinou
    let awake = 0;
    const sorted = inHour.sort((a, b) => a - b);
    let cs = -1;
    let ce = -1;
    const flush = () => {
      if (ce > cs) awake += Math.max(0, Math.min(ce, hStart + 3_600_000) - Math.max(cs, hStart));
    };
    for (const t of sorted) {
      const s = t;
      const e = t + (1 + SUSPEND_AFTER_MIN) * 60_000;
      if (s > ce) {
        flush();
        cs = s;
        ce = e;
      } else if (e > ce) ce = e;
    }
    flush();
    const queries = minutes
      .filter((m) => {
        const t = new Date(m.minute).getTime();
        return t >= hStart && t < hStart + 3_600_000;
      })
      .reduce((n, m) => n + m.queries, 0);
    return { label: new Date(hStart).toLocaleTimeString('sk-SK', { hour: '2-digit', timeZone: 'Europe/Bratislava' }), awake: awake / 60_000, queries };
  });

  // ---- Automatické odporúčania -------------------------------------------
  const tips: { severity: Severity; title: string; text: string }[] = [];
  if (awakePct > 60 && range.hours >= 24) {
    tips.push({
      severity: 'critical',
      title: `Databáze je vzhůru ${awakePct.toFixed(0)} % času`,
      text: 'Neon účtuje hlavně čas, kdy je databáze probuzená — ne počet dotazů. Pokud se téměř neuspává, příčinou jsou skoro vždy pravidelná volání (polling) z otevřených oken/appky. Podívej se na řádky označené „častý“ níže.'
    });
  }
  for (const s of sources) {
    const perHour = s.count / Math.max(1, s.hours);
    const avg = s.totalMs / Math.max(1, s.count);
    if (perHour > 120 && s.hours >= 2) {
      tips.push({
        severity: perHour > 600 ? 'critical' : 'warning',
        title: `${s.source} — ${fmtNum(perHour)} dopytov za hodinu`,
        text: 'Volá se velmi často, pravděpodobně pravidelným obnovováním. Řešení: prodloužit interval, obnovovat jen když je okno/appka aktivní, přidat cache nebo tato data přesunout mimo databázi.'
      });
    }
    if (avg > 150 && s.count >= 10) {
      tips.push({
        severity: avg > 500 ? 'critical' : 'warning',
        title: `${s.source} — priemerne ${fmtMs(avg)} na dopyt`,
        text: 'Pomalé dotazy. Zkontrolovat index na sloupcích ve WHERE/ORDER BY, načítat jen potřebná pole (select) a omezit počet řádků (take), případně výsledek cachovat (unstable_cache).'
      });
    }
    if (s.writes > 0 && s.writes / s.count > 0.5 && s.count > 200) {
      tips.push({
        severity: 'info',
        title: `${s.source} — prevažujú zápisy (${fmtNum(s.writes)})`,
        text: 'Časté zápisy (např. „poslední aktivita“, „naposledy online“) lze omezit: zapisovat nejvýše jednou za pár minut na uživatele.'
      });
    }
  }
  const sevOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  tips.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  const maxBar = Math.max(1, ...hourBars.map((h) => h.queries));

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <h1 className="font-display font-extrabold text-3xl text-ink">Výkon a náklady databázy</h1>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin/vykon?rozsah=${r.key}&cu=${cu}`}
              className={`text-sm font-semibold px-3.5 py-1.5 rounded-full border ${r.key === range.key ? 'bg-accent text-white border-accent' : 'border-line text-ink hover:border-accent'}`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted mb-6 max-w-3xl">
        Každý dotaz do databáze se měří průběžně a jednou za minutu uloží. Stránka se sama neobnovuje — automatické obnovování by samo drželo databázi vzhůru a zvyšovalo náklady. Aktuální stav načteš tlačítkem obnovit v prohlížeči. Vlastní dotazy této stránky se nezapočítávají.
      </p>

      {!PERF_ENABLED && (
        <div className="mb-6 border border-amber-300 bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">Měření je vypnuté proměnnou PERF_MONITOR=off.</div>
      )}
      {tablesMissing && (
        <div className="mb-6 border border-red-300 bg-red-50 text-red-800 rounded-xl p-4 text-sm">
          Tabulky pro měření ještě neexistují — spusť <code>npx prisma db push</code> a nasaď web.
        </div>
      )}

      {/* SÚHRN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="border border-line rounded-xl p-4 bg-card">
          <div className="text-xs text-muted font-semibold uppercase">Databáza prebudená (odhad)</div>
          <div className="font-display font-extrabold text-2xl text-ink mt-1">{fmtHours(awakeMin)}</div>
          <div className={`text-xs font-semibold mt-1 ${awakePct > 60 ? 'text-red-600' : awakePct > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {awakePct.toFixed(0)} % z {range.label}
          </div>
        </div>
        <div className="border border-line rounded-xl p-4 bg-card">
          <div className="text-xs text-muted font-semibold uppercase">Odhad nákladov (compute)</div>
          <div className="font-display font-extrabold text-2xl text-ink mt-1">${estCost.toFixed(2)}</div>
          <div className="text-xs text-muted mt-1">
            pri {cu} CU · mesačne ~${monthlyProjection.toFixed(2)}
          </div>
        </div>
        <div className="border border-line rounded-xl p-4 bg-card">
          <div className="text-xs text-muted font-semibold uppercase">Dopytov</div>
          <div className="font-display font-extrabold text-2xl text-ink mt-1">{fmtNum(totalQueries)}</div>
          <div className="text-xs text-muted mt-1">{fmtNum(totalQueries / Math.max(1, range.hours))} za hodinu</div>
        </div>
        <div className="border border-line rounded-xl p-4 bg-card">
          <div className="text-xs text-muted font-semibold uppercase">Čas v databáze</div>
          <div className="font-display font-extrabold text-2xl text-ink mt-1">{fmtMs(totalDbMs)}</div>
          <div className="text-xs text-muted mt-1">priemer {fmtMs(totalDbMs / Math.max(1, totalQueries))} / dopyt</div>
        </div>
      </div>

      <p className="text-xs text-muted -mt-5 mb-8">
        Odhad počítá s velikostí{' '}
        {[0.25, 0.5, 1, 2].map((v) => (
          <Link key={v} href={`/admin/vykon?rozsah=${range.key}&cu=${v}`} className={`mx-0.5 font-semibold ${v === cu ? 'text-accent' : 'hover:text-accent'}`}>
            {v} CU
          </Link>
        ))}{' '}
        a cenou ~${PRICE_PER_CU_HOUR}/CU-hod. Přesné číslo vždy ukáže Neon (Billing) — tady jde o to vidět, CO náklady způsobuje.
      </p>

      {/* ODPORÚČANIA */}
      <h2 className="font-display font-bold text-xl text-ink mb-3">Co je potřeba řešit</h2>
      {tips.length === 0 ? (
        <p className="text-sm text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-xl p-4 mb-8">
          Zatím nic kritického. {totalQueries < 500 && 'Nasbíraných dat je zatím málo — podívej se znovu po dni či dvou běžného používání.'}
        </p>
      ) : (
        <div className="space-y-2 mb-8">
          {tips.slice(0, 15).map((t, i) => (
            <div
              key={i}
              className={`rounded-xl p-4 border text-sm ${
                t.severity === 'critical' ? 'border-red-300 bg-red-50 text-red-900' : t.severity === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-sky-200 bg-sky-50 text-sky-900'
              }`}
            >
              <div className="font-bold mb-0.5">
                {t.severity === 'critical' ? '🔴 ' : t.severity === 'warning' ? '🟠 ' : '🔵 '}
                {t.title}
              </div>
              <div className="opacity-90">{t.text}</div>
            </div>
          ))}
        </div>
      )}

      {/* ČASOVÁ OS 24 H */}
      <h2 className="font-display font-bold text-xl text-ink mb-1">Posledních 24 hodin</h2>
      <p className="text-xs text-muted mb-3">Výška sloupce = počet dotazů. Barva = kolik minut z hodiny byla databáze vzhůru (zelená málo, červená skoro celou hodinu).</p>
      <div className="border border-line rounded-xl p-4 bg-card mb-8 overflow-x-auto">
        <div className="flex items-end gap-1 h-40 min-w-[560px]">
          {hourBars.map((h, i) => {
            const color = h.awake > 45 ? 'bg-red-500' : h.awake > 20 ? 'bg-amber-500' : h.awake > 0 ? 'bg-emerald-500' : 'bg-line';
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${h.label}:00 — ${fmtNum(h.queries)} dotazů, vzhůru ${Math.round(h.awake)} min`}>
                <div className={`w-full rounded-t ${color}`} style={{ height: `${Math.max(3, (h.queries / maxBar) * 100)}%` }} />
                <div className="text-[10px] text-muted mt-1">{h.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PODĽA STRÁNOK / API */}
      <h2 className="font-display font-bold text-xl text-ink mb-3">Odkud dotazy přicházejí</h2>
      <div className="border border-line rounded-xl overflow-x-auto mb-8">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-surface text-muted text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Stránka / API</th>
              <th className="text-right px-3 py-2">Dopytov</th>
              <th className="text-right px-3 py-2">Podiel</th>
              <th className="text-right px-3 py-2">Za hodinu</th>
              <th className="text-right px-3 py-2">Priemer</th>
              <th className="text-right px-3 py-2">Najdlhší</th>
              <th className="text-right px-3 py-2">Čas celkem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {topByCount.map((s) => {
              const perHour = s.count / Math.max(1, s.hours);
              const avg = s.totalMs / Math.max(1, s.count);
              return (
                <tr key={s.source} className="bg-card">
                  <td className="px-3 py-2 font-mono text-xs text-ink">
                    {s.source}
                    {perHour > 120 && s.hours >= 2 && <span className="ml-2 text-[10px] font-sans font-bold bg-red-100 text-red-700 rounded-full px-2 py-0.5">častý</span>}
                    {avg > 150 && <span className="ml-2 text-[10px] font-sans font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">pomalý</span>}
                  </td>
                  <td className="px-3 py-2 text-right">{fmtNum(s.count)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-line rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${(s.count / Math.max(1, totalQueries)) * 100}%` }} />
                      </div>
                      {((s.count / Math.max(1, totalQueries)) * 100).toFixed(1)} %
                    </div>
                  </td>
                  <td className={`px-3 py-2 text-right ${perHour > 120 && s.hours >= 2 ? 'text-red-600 font-bold' : ''}`}>{fmtNum(perHour)}</td>
                  <td className={`px-3 py-2 text-right ${avg > 150 ? 'text-amber-600 font-bold' : ''}`}>{fmtMs(avg)}</td>
                  <td className="px-3 py-2 text-right">{fmtMs(s.maxMs)}</td>
                  <td className="px-3 py-2 text-right">{fmtMs(s.totalMs)}</td>
                </tr>
              );
            })}
            {topByCount.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted bg-card">
                  Zatím žádná data — první se objeví asi minutu po nasazení.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PODĽA TABULIEK */}
      <h2 className="font-display font-bold text-xl text-ink mb-3">Nejnáročnější operace (tabulka + operace)</h2>
      <div className="border border-line rounded-xl overflow-x-auto mb-8">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-surface text-muted text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Tabulka</th>
              <th className="text-left px-3 py-2">Operácia</th>
              <th className="text-left px-3 py-2">Odkud</th>
              <th className="text-right px-3 py-2">Počet</th>
              <th className="text-right px-3 py-2">Priemer</th>
              <th className="text-right px-3 py-2">Čas celkem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {topModels.map((s, i) => (
              <tr key={i} className="bg-card">
                <td className="px-3 py-2 font-semibold text-ink">{s.model}</td>
                <td className="px-3 py-2 font-mono text-xs">{s.action}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted">{s.source}</td>
                <td className="px-3 py-2 text-right">{fmtNum(s.count)}</td>
                <td className="px-3 py-2 text-right">{fmtMs(s.totalMs / Math.max(1, s.count))}</td>
                <td className="px-3 py-2 text-right">{fmtMs(s.totalMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PG_STAT_STATEMENTS */}
      <h2 className="font-display font-bold text-xl text-ink mb-1">Najdrahšie SQL dopyty (priamo zo servera databázy)</h2>
      <p className="text-xs text-muted mb-3">
        Zdroj: pg_stat_statements. Neon tieto čísla vynuluje pri každom uspatí databázy, takže ukazujú len obdobie od posledného prebudenia.
      </p>
      {pgss ? (
        <div className="border border-line rounded-xl overflow-x-auto mb-4">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-surface text-muted text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">SQL</th>
                <th className="text-right px-3 py-2">Volaní</th>
                <th className="text-right px-3 py-2">Priemer</th>
                <th className="text-right px-3 py-2">Celkem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pgss.map((q, i) => (
                <tr key={i} className="bg-card align-top">
                  <td className="px-3 py-2 font-mono text-[11px] text-ink max-w-xl">
                    <div className="line-clamp-3 break-all">{q.query}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{fmtNum(q.calls)}</td>
                  <td className={`px-3 py-2 text-right ${q.mean > 150 ? 'text-amber-600 font-bold' : ''}`}>{fmtMs(q.mean)}</td>
                  <td className="px-3 py-2 text-right">{fmtMs(q.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted border border-line rounded-xl p-4 bg-card mb-4">
          Rozšíření pg_stat_statements není zapnuté ({pgssError?.slice(0, 120)}). Zapneš ho tlačítkem níže — je to bezpečné, jen sbírá statistiku.
        </p>
      )}

      <PerfAdminActions pgssEnabled={!!pgss} />
    </div>
  );
}
