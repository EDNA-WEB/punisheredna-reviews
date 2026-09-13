// Profesionálny model box office, používaný filmovými analytikmi a novinármi
// (napr. Deadline, The Hollywood Reporter) — kiná si nechávajú väčšinu z tržieb,
// štúdio dostáva len svoj podiel ("studio rentals"), ktorý sa navyše líši podľa
// regiónu. K tomu sa pripočítavajú sekundárne príjmy (VOD, streaming, TV, fyzické
// médiá) — tie často pokryjú marketing a rozhodnú o skutočnej ziskovosti filmu.
const STUDIO_SHARE_USA = 0.5;
const STUDIO_SHARE_INTERNATIONAL = 0.4;
const STUDIO_SHARE_CHINA = 0.25;

// Rýchly, všeobecne používaný odhad bodu zvratu — film musí celosvetovo (v hrubých
// tržbách z kín) zarobiť približne 2,5-násobok produkčného rozpočtu, aby sa
// pokryli náklady na marketing, distribúciu a podiel kín. Slúži len ako rýchly
// referenčný ukazovateľ vedľa skutočného prepočtu nižšie.
const QUICK_MULTIPLIER = 2.5;

export type BoxOfficeStats = {
  totalCost: number;
  target: number;
  earned: number;
  ratio: number | null;
  success: boolean;
  studioTheatricalRevenue: number;
  ancillaryRevenue: number;
  totalStudioRevenue: number;
  profit: number;
  profitable: boolean;
};

export function computeBoxOffice(
  budget: number | null,
  marketingBudget: number | null,
  boxOffice: number | null,
  domesticBoxOffice: number | null = null,
  internationalBoxOffice: number | null = null,
  chinaBoxOffice: number | null = null,
  ancillaryRevenue: number | null = null
): BoxOfficeStats | null {
  if (!budget) return null;

  const totalCost = budget + (marketingBudget || 0);
  const target = budget * QUICK_MULTIPLIER;
  const earned = boxOffice || 0;
  const ratio = target > 0 ? earned / target : null;

  // Skutočný podiel štúdia z kín — podľa regiónu. Ak nemáme rozpad podľa krajín,
  // použijeme len celkové hrubé tržby vynásobené priemerným medzinárodným
  // podielom (40 %) ako konzervatívny odhad.
  const domestic = domesticBoxOffice || 0;
  const china = chinaBoxOffice || 0;
  const internationalTotal = internationalBoxOffice || 0;
  const internationalNonChina = Math.max(0, internationalTotal - china);

  let studioTheatricalRevenue: number;
  if (domesticBoxOffice !== null || internationalBoxOffice !== null) {
    studioTheatricalRevenue =
      domestic * STUDIO_SHARE_USA + internationalNonChina * STUDIO_SHARE_INTERNATIONAL + china * STUDIO_SHARE_CHINA;
  } else {
    // Bez rozpadu podľa krajín — konzervatívny odhad z celkových tržieb.
    studioTheatricalRevenue = earned * STUDIO_SHARE_INTERNATIONAL;
  }

  const ancillary = ancillaryRevenue || 0;
  const totalStudioRevenue = studioTheatricalRevenue + ancillary;
  const profit = totalStudioRevenue - totalCost;

  return {
    totalCost,
    target,
    earned,
    ratio,
    success: ratio !== null && ratio >= 1,
    studioTheatricalRevenue,
    ancillaryRevenue: ancillary,
    totalStudioRevenue,
    profit,
    profitable: profit > 0
  };
}

export function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)} mld.`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)} mil.`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)} tis.`;
  return `${sign}$${abs}`;
}
