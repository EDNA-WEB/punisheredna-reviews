// Jednoduché, spoľahlivé mapovanie bežných názvov krajín (aj v angličtine, ako
// ich vracia TMDb/Wikipedia formát miesta narodenia) na ISO kód, z ktorého sa
// dá poskladať adresa vlajky cez flagcdn.com (žiadny API kľúč netreba).
const COUNTRY_TO_ISO: Record<string, string> = {
  usa: 'us', 'united states': 'us', 'united states of america': 'us',
  'united kingdom': 'gb', uk: 'gb', england: 'gb', scotland: 'gb', wales: 'gb',
  slovensko: 'sk', slovakia: 'sk',
  'czech republic': 'cz', czechia: 'cz', 'česko': 'cz',
  germany: 'de', deutschland: 'de',
  france: 'fr', italy: 'it', spain: 'es', canada: 'ca', australia: 'au',
  poland: 'pl', austria: 'at', switzerland: 'ch', netherlands: 'nl',
  belgium: 'be', sweden: 'se', norway: 'no', denmark: 'dk', finland: 'fi',
  ireland: 'ie', portugal: 'pt', greece: 'gr', hungary: 'hu', romania: 'ro',
  russia: 'ru', ukraine: 'ua', japan: 'jp', china: 'cn', 'south korea': 'kr',
  india: 'in', brazil: 'br', mexico: 'mx', argentina: 'ar', 'new zealand': 'nz'
};

export function getCountryFlagUrl(birthPlace: string | null): { url: string; countryName: string } | null {
  if (!birthPlace) return null;
  const parts = birthPlace.split(',').map((p) => p.trim());
  const lastPart = parts[parts.length - 1]?.toLowerCase();
  if (!lastPart) return null;
  const iso = COUNTRY_TO_ISO[lastPart];
  if (!iso) return null;
  return { url: `https://flagcdn.com/w40/${iso}.png`, countryName: parts[parts.length - 1] };
}
