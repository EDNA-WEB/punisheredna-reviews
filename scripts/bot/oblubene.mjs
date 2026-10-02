// Bot „Oblíbené mezi fanoušky“ — spúšťa ho GitHub Actions
// (.github/workflows/oblubene-fanousci.yml). Raz za 20 hodín stiahne aktuálne
// poradie obľúbených titulov a pošle ho webu na /api/cron/fan-favorites.
// Keď sťahovanie zlyhá, na webe ostanú posledné úspešne uložené dáta.
//
// Premenné prostredia: SITE_URL, CRON_SECRET, FORCE ("true" = bez čakania na 20 h)

const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const CRON_SECRET = process.env.CRON_SECRET || '';
const FORCE = process.env.FORCE === 'true';
const API_URL = 'https://api.graphql.imdb.com/';
const MAX_ITEMS = 30;

if (!SITE_URL || !CRON_SECRET) {
  console.error('Chýba SITE_URL alebo CRON_SECRET v GitHub Secrets.');
  process.exit(1);
}
const auth = { Authorization: `Bearer ${CRON_SECRET}` };

async function status() {
  const res = await fetch(`${SITE_URL}/api/cron/fan-favorites`, { headers: auth });
  if (!res.ok) throw new Error(`Web vrátil ${res.status} pri kontrole stavu.`);
  const data = await res.json();
  console.log(`Posledná aktualizácia: ${data.updatedAt || 'nikdy'}${data.ageHours != null ? ` (pred ${data.ageHours.toFixed(1)} h)` : ''}`);
  return data;
}

// Chýbajúce tituly sa importujú po niekoľkých, kým nie je hotovo.
async function importMissing() {
  for (let round = 1; round <= 25; round++) {
    const res = await fetch(`${SITE_URL}/api/cron/fan-favorites?krok=import`, { method: 'POST', headers: auth });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Import zlyhal: ${res.status} ${data.error || ''}`);
    (data.imported || []).forEach((t) => console.log(`  pridané: ${t}`));
    (data.failed || []).forEach((t) => console.log(`  nepodarilo sa pridať: ${t}`));
    if (!data.pending) return;
  }
  console.log('Import nedobehol celý, zvyšok sa dokončí pri ďalšom behu.');
}

// Prejde JSON a pozbiera tituly v poradí, v akom sa objavujú.
function collect(node, out, seen) {
  if (!node || typeof node !== 'object' || out.length >= MAX_ITEMS) return;
  if (Array.isArray(node)) {
    for (const n of node) collect(n, out, seen);
    return;
  }
  const id = typeof node.id === 'string' ? node.id : null;
  const title = node.titleText?.text || node.originalTitleText?.text || null;
  if (id && /^tt\d{6,10}$/.test(id) && title && !seen.has(id)) {
    seen.add(id);
    const year = node.releaseYear?.year ?? null;
    out.push({ sourceId: id, title: node.originalTitleText?.text || title, year: Number.isFinite(year) ? year : null });
  }
  for (const key of Object.keys(node)) collect(node[key], out, seen);
}

// Náhodný identifikátor relácie v tvare, aký posiela prehliadač (123-1234567-1234567).
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

const NODE = 'node { id titleText { text } originalTitleText { text } releaseYear { year } }';

// 1. spôsob: zoznam „fan favorites“.
async function fanPicks() {
  const data = await gql(`query { fanPicksTitles(first: ${MAX_ITEMS}) { edges { ${NODE} } } }`);
  const out = [];
  collect(data?.fanPicksTitles, out, new Set());
  return out;
}

// 2. spôsob (záloha): najpopulárnejšie filmy a seriály, striedavo.
async function mostPopular() {
  const data = await gql(`query {
    movies: chartTitles(first: 20, chart: { chartType: MOST_POPULAR_MOVIES }) { edges { ${NODE} } }
    tv: chartTitles(first: 10, chart: { chartType: MOST_POPULAR_TV_SHOWS }) { edges { ${NODE} } }
  }`);
  const movies = [];
  const tv = [];
  collect(data?.movies, movies, new Set());
  collect(data?.tv, tv, new Set());
  const out = [];
  while ((movies.length || tv.length) && out.length < MAX_ITEMS) {
    out.push(...movies.splice(0, 2));
    if (tv.length) out.push(tv.shift());
  }
  return out.slice(0, MAX_ITEMS);
}

async function fetchList() {
  const attempts = [
    ['fan favorites', fanPicks],
    ['najpopulárnejšie (záloha)', mostPopular]
  ];
  for (const [name, fn] of attempts) {
    try {
      const items = await fn();
      console.log(`Zoznam „${name}“: ${items.length} titulov`);
      if (items.length >= 5) return items;
    } catch (error) {
      console.log(`Zoznam „${name}“ zlyhal: ${error.message}`);
    }
  }
  throw new Error('Nepodarilo sa získať žiadny zoznam, na webe ostávajú pôvodné dáta.');
}

try {
  const st = await status();
  if (!FORCE && !st.due) {
    if (st.pending) {
      console.log(`Dokončujem import ${st.pending} titulov z minulého behu:`);
      await importMissing();
    } else {
      console.log('Ešte neuplynulo 20 hodín, nič sa nesťahuje.');
    }
    process.exit(0);
  }
  const items = await fetchList();
  console.log(`Stiahnutých titulov: ${items.length}`);
  items.slice(0, 10).forEach((i, n) => console.log(`  ${n + 1}. ${i.title}${i.year ? ` (${i.year})` : ''}`));

  const res = await fetch(`${SITE_URL}/api/cron/fan-favorites`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Web odmietol dáta: ${res.status} ${data.error || ''}`);
  console.log(`Uložené: ${data.saved}, už v databáze: ${data.matched}, na doplnenie: ${data.pending}`);
  if (data.unresolved?.length) {
    console.log('Nenájdené ani na TMDb (nezobrazia sa):');
    data.unresolved.forEach((t) => console.log(`  ${t}`));
  }
  if (data.pending) {
    console.log('Pridávam chýbajúce tituly:');
    await importMissing();
  }
  console.log('Hotovo.');
} catch (error) {
  console.error('Chyba:', error.message);
  process.exit(1);
}
