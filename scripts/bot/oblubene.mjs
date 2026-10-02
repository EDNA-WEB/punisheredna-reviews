// Bot „Oblíbené mezi fanoušky“ — spúšťa ho GitHub Actions
// (.github/workflows/oblubene-fanousci.yml). Raz za 20 hodín stiahne aktuálne
// poradie obľúbených titulov a pošle ho webu na /api/cron/fan-favorites.
// Keď sťahovanie zlyhá, na webe ostanú posledné úspešne uložené dáta.
//
// Premenné prostredia: SITE_URL, CRON_SECRET, FORCE ("true" = bez čakania na 20 h)

const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const CRON_SECRET = process.env.CRON_SECRET || '';
const FORCE = process.env.FORCE === 'true';
const SOURCE_URL = 'https://www.imdb.com/what-to-watch/fan-favorites/';
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

// Prejde JSON stránky a pozbiera tituly v poradí, v akom sa objavujú.
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
    const year = node.releaseYear?.year ?? node.releaseDate?.year ?? null;
    out.push({ sourceId: id, title: node.originalTitleText?.text || title, year: Number.isFinite(year) ? year : null });
  }
  for (const key of Object.keys(node)) collect(node[key], out, seen);
}

async function fetchList() {
  const res = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml'
    }
  });
  if (!res.ok) throw new Error(`Zdroj vrátil ${res.status}.`);
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Na stránke sa nenašli dáta (zmenila sa štruktúra stránky alebo bol prístup zablokovaný).');
  const json = JSON.parse(m[1]);
  const out = [];
  collect(json?.props?.pageProps ?? json, out, new Set());
  return out;
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
  if (items.length < 5) throw new Error('Príliš málo titulov, na webe ostávajú pôvodné dáta.');
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
