export function computePercent(ratings: { value: number }[]): number | null {
  if (ratings.length === 0) return null;
  const avg = ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length;
  return Math.round((avg / 5) * 100);
}

export function scoreColorStyle(percent: number | null): { backgroundColor: string; color: string } {
  if (percent === null) return { backgroundColor: '#E8E7E5', color: '#6B6F76' };
  if (percent < 20) return { backgroundColor: '#15171A', color: '#FFFFFF' };
  if (percent < 70) return { backgroundColor: '#2563EB', color: '#FFFFFF' };
  return { backgroundColor: '#059669', color: '#FFFFFF' };
}

export function starsFromValue(value: number): { full: number; half: boolean; empty: number } {
  const v = Math.max(0, Math.min(5, value || 0));
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return { full, half, empty };
}