// Bot „Top 10 tento týden“ — spúšťa ho GitHub Actions (.github/workflows/top10.yml).
// Raz za 24 hodín stiahne aktuálny týždenný rebríček Top 10 a pošle ho webu
// na /api/cron/top10. Keď sťahovanie zlyhá, na webe ostane posledný rebríček.
//
// Premenné prostredia: SITE_URL, CRON_SECRET, FORCE ("true" = bez čakania na 24 h)

const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const CRON_SECRET = process.env.CRON_SECRET || '';
const FORCE = process.env.FORCE === 'true';
const API_URL = 'https://api.graphql.imdb.com/';

if (!SITE_URL || !CRON_SECRET) {
  console.error('Chýba SITE_URL alebo CRON_SECRET v GitHub Secrets.');
  process.exit(1);
}
const auth = { Authorization: `Bearer ${CRON_SECRET}` };

const digits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
const SESSION_ID = `${digits(3)}-${digits(7)}-${digits(7)}`;

async function gql(query) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: 'https://www.imdb.com',
      Referer: 'https://www.imdb.com/',
      'x-amzn-sessionid': SESSION_ID,
      'x-imdb-client-name': 'imdb-web-next-localized',
      'x-imdb-user-country': 'US',
      'x-imdb-user-language': 'en-US'
    },
    body: JSON.stringify({ query })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`rozhranie vrátilo ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text);
  if (json.errors?.length && !json.data) throw new Error(`rozhranie hlási chybu: ${json.errors[0].message}`);
  if (json.errors?.length) console.log(`  upozornenie rozhrania: ${json.errors[0].message}`);
  return json.data;
}

function collect(node, out, seen, max = 10) {
  if (!node || typeof node !== 'object' || out.length >= max) return;
  if (Array.isArray(node)) {
    for (const n of node) collect(n, out, seen, max);
    return;
  }
  const id = typeof node.id === 'string' ? node.id : null;
  const title = node.originalTitleText?.text || node.titleText?.text || null;
  if (id && /^tt\d{6,10}$/.test(id) && title && !seen.has(id)) {
    seen.add(id);
    const year = node.releaseYear?.year ?? null;
    out.push({ sourceId: id, title, year: Number.isFinite(year) ? year : null });
  }
  for (const k of Object.keys(node)) collect(node[k], out, seen, max);
}

const NODE = 'node { id titleText { text } originalTitleText { text } releaseYear { year } }';

// 1. spôsob: týždenný rebríček Top 10 (filmy aj seriály spolu)
async function weeklyTop10() {
  const data = await gql(`query { topMeterTitles(first: 10, topMeterTitlesType: ALL) { edges { ${NODE} } } }`);
  const out = [];
  collect(data?.topMeterTitles, out, new Set());
  return out;
}

// 2. spôsob (záloha): najpopulárnejšie filmy a seriály, striedavo
async function mostPopular() {
  const data = await gql(`query {
    movies: chartTitles(first: 10, chart: { chartType: MOST_POPULAR_MOVIES }) { edges { ${NODE} } }
    tv: chartTitles(first: 10, chart: { chartType: MOST_POPULAR_TV_SHOWS }) { edges { ${NODE} } }
  }`);
  const movies = [];
  const tv = [];
  collect(data?.movies, movies, new Set());
  collect(data?.tv, tv, new Set());
  const out = [];
  while ((movies.length || tv.length) && out.length < 10) {
    if (movies.length) out.push(movies.shift());
    if (tv.length && out.length < 10) out.push(tv.shift());
  }
  return out;
}

async function fetchList() {
  for (const [name, fn] of [
    ['Top 10 týždňa', weeklyTop10],
    ['najpopulárnejšie (záloha)', mostPopular]
  ]) {
    try {
      const items = await fn();
      console.log(`Zoznam „${name}“: ${items.length} titulov`);
      if (items.length >= 5) return items;
    } catch (error) {
      console.log(`Zoznam „${name}“ zlyhal: ${error.message}`);
    }
  }
  throw new Error('Nepodarilo sa získať rebríček, na webe ostáva posledný.');
}

async function importMissing() {
  for (let round = 1; round <= 10; round++) {
    const res = await fetch(`${SITE_URL}/api/cron/top10?krok=import`, { method: 'POST', headers: auth });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Import zlyhal: ${res.status} ${data.error || ''}`);
    (data.imported || []).forEach((t) => console.log(`  pridané: ${t}`));
    (data.failed || []).forEach((t) => console.log(`  nepodarilo sa pridať: ${t}`));
    if (!data.pending) return;
  }
}

try {
  const st = await (await fetch(`${SITE_URL}/api/cron/top10`, { headers: auth })).json();
  console.log(`Posledná aktualizácia: ${st.updatedAt || 'nikdy'}`);
  if (!FORCE && !st.due) {
    if (st.pending) await importMissing();
    else console.log('Rebríček je aktuálny, nič sa nesťahuje.');
    process.exit(0);
  }
  const items = await fetchList();
  items.forEach((i, n) => console.log(`  ${n + 1}. ${i.title}${i.year ? ` (${i.year})` : ''}`));
  const res = await fetch(`${SITE_URL}/api/cron/top10`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Web odmietol dáta: ${res.status} ${data.error || ''}`);
  console.log(`Uložené: ${data.saved}, už v databáze: ${data.matched}, na doplnenie: ${data.pending}`);
  (data.unresolved || []).forEach((t) => console.log(`  nenájdené na TMDb: ${t}`));
  if (data.pending) await importMissing();
  console.log('Hotovo.');
} catch (error) {
  console.error('Chyba:', error.message);
  process.exit(1);
}
