// Spoločná kontrola hodnotenia (hviezdičky 0,5 – 5 po polovičkách) pre všetky
// miesta, kde sa hodnotenie ukladá spolu s recenziou. Predtým sa pri recenzii
// uložilo akékoľvek číslo (napr. 1 000 000 000), čo rozbilo priemer filmu.
//
//  - prázdne / 0 / null  → { value: null }  (recenzia bez hodnotenia)
//  - platná hodnota      → { value: číslo }
//  - čokoľvek iné        → { value: null, error }
export function parseRatingValue(raw: unknown): { value: number | null; error?: string } {
  if (raw === undefined || raw === null || raw === '' || raw === 0 || raw === '0') return { value: null };
  if (typeof raw !== 'number' && typeof raw !== 'string') return { value: null, error: 'Neplatné hodnocení.' };
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0.5 || v > 5 || Math.round(v * 2) !== v * 2) {
    return { value: null, error: 'Neplatné hodnocení.' };
  }
  return { value: v };
}

export const RATINGS_DISABLED_MESSAGE = 'Administrátor ti omezil možnost hodnotit filmy.';
