// Bežne používané pravidlo vo filmovom priemysle: film sa považuje za ziskový,
// keď jeho tržby v kinách dosiahnu aspoň 2,5-násobok súčtu výrobného rozpočtu
// a marketingového rozpočtu (kiná si berú podiel, plus náklady na distribúciu).
const SUCCESS_MULTIPLIER = 2.5;

export type BoxOfficeStats = {
  totalCost: number;
  target: number;
  earned: number;
  ratio: number | null;
  success: boolean;
};

export function computeBoxOffice(budget: number | null, marketingBudget: number | null, boxOffice: number | null): BoxOfficeStats | null {
  if (!budget) return null;
  const totalCost = budget + (marketingBudget || 0);
  const target = totalCost * SUCCESS_MULTIPLIER;
  const earned = boxOffice || 0;
  const ratio = target > 0 ? earned / target : null;
  return { totalCost, target, earned, ratio, success: ratio !== null && ratio >= 1 };
}

export function formatMoney(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)} mld.`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)} mil.`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)} tis.`;
  return `$${value}`;
}
