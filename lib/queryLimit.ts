// Bezpečné čítanie čísla z adresy (?limit=, ?page=): vždy celé číslo v rozsahu,
// nech sa jedným dopytom nedá stiahnuť celá databáza ani poslať záporné číslo.
export function clampInt(raw: string | null | undefined, fallback: number, min: number, max: number): number {
  const n = Math.floor(Number(raw));
  if (raw === null || raw === undefined || raw === '' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
