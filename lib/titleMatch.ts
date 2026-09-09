// Zdieľaná logika párovania názvov filmov, používaná vo všetkých piatich
// hromadných importoch. Riešia sa tu dva časté zdroje "nenájdených" záznamov:
//
// 1) Oddeľovač "–"/"-" musí mať MEDZERY na oboch stranách, inak sa nesprávne
//    rozdelia názvy s pomlčkou vo vnútri (napr. "Spider-Man 3" by sa bez tejto
//    podmienky rozdelilo na "Spider" a "Man 3 – ...").
// 2) Normalizácia textu je dôkladnejšia — okrem diakritiky odstraňuje aj
//    neviditeľné znaky, zjednocuje viacnásobné medzery a rôzne typy úvodzoviek.

export const SEPARATOR = /\s+[–—-]\s+/;

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

// Rozdelí riadok na časti podľa oddeľovača s medzerami na oboch stranách.
// Vráti null, ak riadok neobsahuje aspoň minParts častí.
export function splitLineParts(line: string, minParts: number): string[] | null {
  const parts = line.split(SEPARATOR).map((p) => p.trim());
  if (parts.length < minParts) return null;
  return parts;
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
