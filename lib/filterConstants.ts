export const CONTENT_TYPES = ['Film', 'Seriál', 'TV film'];

export const GENRES = [
  'Akčný', 'Dobrodružný', 'Animovaný', 'Biografický', 'Detský', 'Dokumentárny',
  'Dráma', 'Fantasy', 'Historický', 'Horor', 'Hudobný', 'Katastrofický',
  'Komédia', 'Krátkometrážny', 'Krimi', 'Mysteriózny', 'Muzikál', 'Poviedkový',
  'Politický', 'Príroda', 'Psychologický', 'Rodinný', 'Romantický', 'Road movie',
  'Sci-Fi', 'Historický', 'Šport', 'Thriller', 'Vojnový', 'Western', 'Životopisný',
  'Erotický', 'Experimentálny', 'Grotesque', 'Katastrofický', 'Noir', 'Pohádka',
  'Reality TV', 'Talk show', 'Telenovela', 'Anime'
];

export const COUNTRIES = [
  'USA', 'Veľká Británia', 'Francúzsko', 'Nemecko', 'Taliansko', 'Španielsko',
  'Česko', 'Slovensko', 'Poľsko', 'Maďarsko', 'Rakúsko', 'Švajčiarsko',
  'Belgicko', 'Holandsko', 'Švédsko', 'Nórsko', 'Dánsko', 'Fínsko',
  'Írsko', 'Portugalsko', 'Grécko', 'Rumunsko', 'Bulharsko', 'Chorvátsko',
  'Srbsko', 'Slovinsko', 'Ukrajina', 'Rusko', 'Turecko', 'Izrael',
  'Kanada', 'Mexiko', 'Brazília', 'Argentína', 'Kolumbia', 'Čile',
  'Japonsko', 'Južná Kórea', 'Čína', 'India', 'Thajsko', 'Hongkong',
  'Taiwan', 'Filipíny', 'Indonézia', 'Vietnam',
  'Austrália', 'Nový Zéland',
  'Juhoafrická republika', 'Egypt', 'Maroko', 'Nigéria',
  'Island', 'Litva', 'Lotyšsko', 'Estónsko', 'Luxembursko'
];

export const PERSON_TYPES = [
  'Herec', 'Účinkujúci', 'Režisér', 'Producent', 'Tvorca',
  'Scenárista', 'Spisovateľ', 'Kameraman', 'Skladateľ', 'Casting',
  'Strihač', 'Zvukár', 'Scénograf', 'Maskér', 'Kostymér'
];

export const YEARS = Array.from({ length: 2050 - 1900 + 1 }, (_, i) => 2050 - i);

export const RATING_STEPS = Array.from({ length: 101 }, (_, i) => i);
