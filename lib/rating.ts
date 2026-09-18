export function computePercent(ratings: { value: number }[]): number | null {
  if (ratings.length === 0) return null;
  const avg = ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length;
  return Math.round((avg / 5) * 100);
}

// Skombinuje vlastné hodnotenia (1-5 hviezd) s hodnotením divákov z TMDb
// (0-10) do jedného percenta — váhovane podľa počtu hlasov na oboch
// stranách, nie jednoduchým 50/50 priemerom. Dôvod: kým nemáme na filme
// veľa vlastných hodnotení, jeden-dva hlasy by inak (pri 50/50 priemere)
// zbytočne silno posúvali výsledok jedným smerom aj oproti tisíckam hlasov
// na TMDb. Akonáhle vlastných hodnotení pribudne, ich váha v priemere prirodzene rastie.
export function computeBlendedPercent(
  ratings: { value: number }[],
  tmdbVoteAverage: number | null,
  tmdbVoteCount: number | null
): number | null {
  const localCount = ratings.length;
  const localSumPercent = ratings.reduce((sum, r) => sum + (r.value / 5) * 100, 0);

  // TMDb dokáže mať pri populárnych filmoch desaťtisíce hlasov — bez stropu
  // by to vlastné hodnotenia úplne prehlušilo, aj keby ich časom pribudlo
  // viac. Strop 50 "hlasov" zachová TMDb ako silný, ale nie absolútne
  // dominantný hlas v porovnaní s vlastným webom.
  const rawTmdbCount = tmdbVoteAverage !== null && tmdbVoteCount ? tmdbVoteCount : 0;
  const tmdbCount = Math.min(rawTmdbCount, 50);
  const tmdbPercent = tmdbVoteAverage !== null ? tmdbVoteAverage * 10 : 0;

  const totalWeight = localCount + tmdbCount;
  if (totalWeight === 0) return null;
  return Math.round((localSumPercent + tmdbPercent * tmdbCount) / totalWeight);
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