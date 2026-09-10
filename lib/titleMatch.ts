// Zdieľaná logika párovania názvov filmov, používaná vo všetkých piatich
// hromadných importoch. Riešia sa tu tri časté zdroje "nenájdených" záznamov:
//
// 1) Oddeľovač "–"/"-" musí mať MEDZERY na oboch stranách, inak sa nesprávne
//    rozdelia názvy s pomlčkou vo vnútri (napr. "Spider-Man 3" by sa bez tejto
//    podmienky rozdelilo na "Spider" a "Man 3 – ...").
// 2) Normalizácia textu je dôkladnejšia — okrem diakritiky odstraňuje aj
//    neviditeľné znaky, zjednocuje viacnásobné medzery a rôzne typy úvodzoviek.
// 3) Riadky môžu prichádzať v rôznych bežných tvaroch (skopírované z Excelu s
//    tabulátormi, s odrážkami, číslované, s inými oddeľovačmi) — všetky sa tu
//    prevedú na jednotný tvar pred ďalším spracovaním.

// Poradie je dôležité: tabulátor a zvislá čiara sú jednoznačné oddeľovače
// (v názve filmu sa prakticky nikdy nevyskytnú), preto majú prednosť pred
// pomlčkou — tá musí mať navyše medzery na oboch stranách, aby sa nepliatla
// s pomlčkou vo vnútri samotného názvu (Spider-Man, X-Men a pod.).
const TAB_SEPARATOR = /\t+/;
const PIPE_SEPARATOR = /\s*\|\s*/;
const DASH_SEPARATOR = /\s+[–—-]\s+/;

// Odstráni bežné predpony zoznamov: odrážky ("- ", "• ", "* ") a číslovanie
// ("1.", "1)", "1 -") na začiatku riadku, čo ľudia často nechajú pri
// kopírovaní z poznámok alebo Wordu.
function stripListPrefix(line: string): string {
  return line.replace(/^\s*(?:[-*•▪◦]\s+|\d{1,3}[.)]\s+)/, '');
}

// Rozdelí celý nahraný text na jednotlivé riadky — zvládne Windows (\r\n),
// Mac (\r) aj Unix (\n) konce riadkov, odstráni odrážky/číslovanie a
// vynechá prázdne riadky.
export function splitLines(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((l) => stripListPrefix(l.trim()).trim())
    .filter(Boolean);
}

export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // diakritika
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // neviditeľné znaky (zero-width, BOM)
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ') // viacnásobné medzery na jednu
    .toLowerCase()
    .trim();
}

// Rozdelí riadok na časti. Vyskúša postupne tabulátor, zvislú čiaru a nakoniec
// pomlčku s medzerami okolo — podľa toho, čo sa v riadku skutočne nachádza.
// Vráti null, ak riadok neobsahuje aspoň minParts častí ani jedným spôsobom.
// Rozdelí text presne "count"-krát podľa daného oddeľovača (nie pri KAŽDOM
// výskyte) — zvyšná časť textu za posledným potrebným delením zostane vcelku,
// aj keby obsahovala ďalšie výskyty toho istého oddeľovača. To je dôležité
// napr. pri zaujímavostiach, kde bežná veta môže obsahovať pomlčku ako
// interpunkciu (napr. "Ridley Scott čerpal inspiráciu — z filmu X").
function splitAtMost(line: string, separator: RegExp, count: number): string[] {
  const parts: string[] = [];
  const re = new RegExp(separator.source, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let splitsUsed = 0;

  while (splitsUsed < count && (match = re.exec(line)) !== null) {
    parts.push(line.slice(lastIndex, match.index));
    lastIndex = match.index + match[0].length;
    splitsUsed++;
  }
  parts.push(line.slice(lastIndex));

  return parts.map((p) => p.trim());
}

export function splitLineParts(line: string, minParts: number): string[] | null {
  for (const separator of [TAB_SEPARATOR, PIPE_SEPARATOR, DASH_SEPARATOR]) {
    if (!separator.test(line)) continue;
    const parts = splitAtMost(line, separator, minParts - 1);
    if (parts.length >= minParts && parts.every((p) => p.length > 0)) return parts;
  }
  return null;
}

export type MovieCandidate = { id: string; title: string; year: string | null; [key: string]: any };
export function buildTitleIndex<T extends MovieCandidate>(movies: T[]): Map<string, T[]> {
  const index = new Map<string, T[]>();
  for (const m of movies) {
    const titles = [m.title, (m as any).originalTitle].filter(Boolean) as string[];
    for (const t of titles) {
      const key = normalizeTitle(t);
      if (!index.has(key)) index.set(key, []);
      if (!index.get(key)!.includes(m)) index.get(key)!.push(m);
    }
  }
  return index;
}

// Z časti "Názov filmu" alebo "Názov filmu (2026)" vytiahne holý názov
// a prípadný explicitný rok, čo slúži na rozlíšenie duplicitných názvov.
export function extractTitleAndYear(rawTitleFull: string): { title: string; year: string | null } {
  const yearMatch = rawTitleFull.match(/^(.+?)\s*\((\d{4})\)\s*$/);
  return yearMatch ? { title: yearMatch[1].trim(), year: yearMatch[2] } : { title: rawTitleFull.trim(), year: null };
}

export function findCandidates<T extends MovieCandidate>(
  index: Map<string, T[]>,
  rawTitleFull: string
): { candidates: T[]; title: string; year: string | null; suggestion: string | null } {
  const { title, year } = extractTitleAndYear(rawTitleFull);
  let candidates = index.get(normalizeTitle(title)) || [];
  if (year) candidates = candidates.filter((c) => (c.year || '').startsWith(year));

  let suggestion: string | null = null;
  if (candidates.length === 0) {
    const normalizedTitle = normalizeTitle(title);
    // Skúsime nájsť podobný názov (napr. film má vo filmotéke prefix/sufix
    // navyše, ako "Star Wars: Mandalorian a Grogu" vs. "Mandalorian a Grogu").
    for (const [key, movies] of index) {
      if (key.includes(normalizedTitle) || normalizedTitle.includes(key)) {
        suggestion = movies[0].title;
        break;
      }
    }
  }

  return { candidates, title, year, suggestion };
}

// --- Podpora JSON vstupu -------------------------------------------------
//
// Nástroje na hromadný import príjmu okrem riadkového textu aj jednoduchý,
// PLOCHÝ JSON tvar (pole objektov s pár konkrétnymi poľami — presne tými,
// čo daný nástroj spracováva aj z textu). Zámerne NEPODPORUJEME vnorené
// tvary, aké majú výstupy scraperov (napr. pole objektov s "csfd_data",
// "where_to_watch", "premieres" alebo tagy ako pole objektov s "link") —
// pri takom tvare nástroj jasne oznámi, že ho nespracuje, namiesto toho,
// aby sa ho pokúsil "domyslieť" a v tichosti naimportoval.

const SCRAPER_SHAPE_KEYS = ['csfd_data', 'where_to_watch', 'premieres', 'external_links', 'related_movies_or_series', 'search_title'];

export type JsonParseResult = { items: any[] } | { error: string };

export function tryParseJsonInput(text: string): JsonParseResult | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return null;

  let data: any;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return { error: 'Text vyzerá ako JSON, ale nedá sa spracovať (skontroluj čiarky a zátvorky).' };
  }

  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const hasScraperShape = SCRAPER_SHAPE_KEYS.some((key) => key in item);
    const hasObjectArrayField = Object.values(item).some(
      (v) => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null && 'link' in v[0]
    );
    if (hasScraperShape || hasObjectArrayField) {
      return {
        error:
          'Tento JSON vyzerá ako export z automatizovaného sťahovania (scrapingu) inej stránky, nie ako jednoduchý zoznam, čo si sám pripravil — takýto tvar nespracujem. Použi jednoduchý plochý formát, napr. [{"title": "Kmotr", "url": "https://..."}].'
      };
    }
  }

  return { items };
}

// Vytiahne hodnotu z objektu podľa prvého kľúča, čo v ňom existuje —
// nech nástroj zvládne bežné varianty pomenovania ("title"/"name", "url"/"link").
export function pickField(item: any, keys: string[]): any {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') return item[key];
  }
  return undefined;
}
