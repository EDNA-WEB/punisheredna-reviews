// Zdieľaná logika fuzzy vyhľadávania — pôvodne z hlavného vyhľadávania
// (/api/search), teraz využívaná aj v editor-search, nech obe miesta
// tolerujú rovnako diakritiku, preklepy a hľadanie v originálnom názve.

// Odstráni diakritiku a prevedie na malé písmená — nech "replacement" nájde
// aj film napísaný s diakritikou, a naopak (napr. hľadanie bez mäkčeňov).
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Klasická Levenshteinova vzdialenosť (počet úprav — vloženie/vymazanie/zmena
// znaku — potrebných na premenu jedného slova na druhé). Používa sa na
// toleranciu preklepov, napr. "goones" → "goonies" (vzdialenosť 2).
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

// Koľko preklepov ešte tolerujeme, závisí od dĺžky slova — pri krátkych
// slovách by tolerancia 2 znakov spôsobila príliš veľa falošných zhôd.
export function maxTypoDistance(wordLength: number): number {
  if (wordLength <= 4) return 1;
  if (wordLength <= 8) return 2;
  return 3;
}

// Vypočíta, ako veľmi presne "candidate" (názov filmu) zodpovedá hľadanému
// výrazu — vyššie číslo = lepšia zhoda. Používa sa na zoradenie výsledkov
// podľa relevancie namiesto len podľa dátumu pridania.
export function matchScore(candidate: string, normalizedQuery: string, queryWords: string[]): number {
  const normalizedCandidate = normalize(candidate);
  if (!normalizedCandidate) return 0;
  if (normalizedCandidate === normalizedQuery) return 100;
  if (normalizedCandidate.startsWith(normalizedQuery)) return 85;
  if (normalizedCandidate.includes(normalizedQuery)) return 70;

  const candidateWords = normalizedCandidate.split(/\s+/).filter(Boolean);

  // Viacslovné hľadanie — napr. "posledny z nas" nájde aj "The Last of Us",
  // ak sú všetky hľadané slová niekde v názve (v akomkoľvek poradí).
  const allWordsPresent = queryWords.every((w) => normalizedCandidate.includes(w));
  if (allWordsPresent) return 55;

  // Tolerancia na preklepy — každé hľadané slovo porovnáme so slovami z
  // názvu a povolíme malý počet rozdielov (podľa dĺžky slova).
  const allWordsCloseEnough = queryWords.every((qw) =>
    candidateWords.some((cw) => levenshtein(qw, cw) <= maxTypoDistance(qw.length))
  );
  if (allWordsCloseEnough) return 45;

  const someWordsClose = queryWords.some((qw) =>
    qw.length >= 3 && candidateWords.some((cw) => levenshtein(qw, cw) <= maxTypoDistance(qw.length))
  );
  if (someWordsClose) return 25;

  const someWordsPresent = queryWords.some((w) => w.length >= 3 && normalizedCandidate.includes(w));
  if (someWordsPresent) return 20;

  return 0;
}
