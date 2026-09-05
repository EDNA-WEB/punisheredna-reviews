// Ročný priemer amerického indexu spotrebiteľských cien (CPI-U), zdroj: U.S. Bureau
// of Labor Statistics. Slúži na prepočet tržieb z rôznych rokov na dnešnú hodnotu
// peňazí — nutné na férové porovnávanie filmov naprieč desaťročiami (film z roku
// 1997 so 600 mil. $ mal v reálnej kúpnej sile oveľa väčší úspech než film s
// rovnakou sumou dnes).
const CPI_BY_YEAR: Record<number, number> = {
  1960: 29.6, 1961: 29.9, 1962: 30.2, 1963: 30.6, 1964: 31.0, 1965: 31.5,
  1966: 32.4, 1967: 33.4, 1968: 34.8, 1969: 36.7, 1970: 38.8, 1971: 40.5,
  1972: 41.8, 1973: 44.4, 1974: 49.3, 1975: 53.8, 1976: 56.9, 1977: 60.6,
  1978: 65.2, 1979: 72.6, 1980: 82.4, 1981: 90.9, 1982: 96.5, 1983: 99.6,
  1984: 103.9, 1985: 107.6, 1986: 109.6, 1987: 113.6, 1988: 118.3, 1989: 124.0,
  1990: 130.7, 1991: 136.2, 1992: 140.3, 1993: 144.5, 1994: 148.2, 1995: 152.4,
  1996: 156.9, 1997: 160.5, 1998: 163.0, 1999: 166.6, 2000: 172.2, 2001: 177.1,
  2002: 179.9, 2003: 184.0, 2004: 188.9, 2005: 195.3, 2006: 201.6, 2007: 207.342,
  2008: 215.303, 2009: 214.537, 2010: 218.056, 2011: 224.939, 2012: 229.594,
  2013: 232.957, 2014: 236.736, 2015: 237.017, 2016: 240.007, 2017: 245.120,
  2018: 251.107, 2019: 255.657, 2020: 258.811, 2021: 270.970, 2022: 292.660,
  2023: 304.700, 2024: 313.689, 2025: 320.580, 2026: 326.790
};

const EARLIEST_YEAR = 1960;
const LATEST_YEAR = 2026;

function cpiForYear(year: number): number {
  const clamped = Math.min(LATEST_YEAR, Math.max(EARLIEST_YEAR, year));
  return CPI_BY_YEAR[clamped] ?? CPI_BY_YEAR[LATEST_YEAR];
}

// Prepočíta sumu z daného roku na dnešnú (2026) hodnotu peňazí.
export function adjustForInflation(amount: number, fromYear: number): number {
  const from = cpiForYear(fromYear);
  const to = CPI_BY_YEAR[LATEST_YEAR];
  return amount * (to / from);
}

export { EARLIEST_YEAR, LATEST_YEAR };
