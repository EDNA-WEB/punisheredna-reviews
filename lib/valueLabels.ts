// Český popis hodnôt, ktoré sú v databáze uložené po slovensky (žánre,
// krajiny, typy osôb). Hodnota v databáze sa NEMENÍ — filtrovanie a
// ukladanie ďalej používa pôvodný tvar; mení sa len to, čo vidí návštevník.
// Neznáma hodnota sa zobrazí tak, ako je.
const CS: Record<string, string> = {
  // žánre
  'Akčný': 'Akční', 'Dobrodružný': 'Dobrodružný', 'Animovaný': 'Animovaný', 'Biografický': 'Biografický', 'Detský': 'Dětský',
  'Dokumentárny': 'Dokumentární', 'Dráma': 'Drama', 'Fantasy': 'Fantasy', 'Historický': 'Historický', 'Horor': 'Horor',
  'Hudobný': 'Hudební', 'Katastrofický': 'Katastrofický', 'Komédia': 'Komedie', 'Krátkometrážny': 'Krátkometrážní', 'Krimi': 'Krimi',
  'Mysteriózny': 'Mysteriózní', 'Muzikál': 'Muzikál', 'Poviedkový': 'Povídkový', 'Politický': 'Politický', 'Príroda': 'Přírodopisný',
  'Psychologický': 'Psychologický', 'Rodinný': 'Rodinný', 'Romantický': 'Romantický', 'Road movie': 'Road movie', 'Sci-Fi': 'Sci-Fi',
  'Šport': 'Sportovní', 'Thriller': 'Thriller', 'Vojnový': 'Válečný', 'Western': 'Western', 'Životopisný': 'Životopisný',
  'Erotický': 'Erotický', 'Experimentálny': 'Experimentální', 'Grotesque': 'Groteska', 'Noir': 'Noir', 'Pohádka': 'Pohádka',
  'Reality TV': 'Reality TV', 'Talk show': 'Talk show', 'Telenovela': 'Telenovela', 'Anime': 'Anime', 'Hororová komédia': 'Hororová komedie',
  // krajiny
  'USA': 'USA', 'Veľká Británia': 'Velká Británie', 'Francúzsko': 'Francie', 'Nemecko': 'Německo', 'Taliansko': 'Itálie',
  'Španielsko': 'Španělsko', 'Česko': 'Česko', 'Slovensko': 'Slovensko', 'Poľsko': 'Polsko', 'Maďarsko': 'Maďarsko',
  'Rakúsko': 'Rakousko', 'Švajčiarsko': 'Švýcarsko', 'Belgicko': 'Belgie', 'Holandsko': 'Nizozemsko', 'Švédsko': 'Švédsko',
  'Nórsko': 'Norsko', 'Dánsko': 'Dánsko', 'Fínsko': 'Finsko', 'Írsko': 'Irsko', 'Portugalsko': 'Portugalsko', 'Grécko': 'Řecko',
  'Rumunsko': 'Rumunsko', 'Bulharsko': 'Bulharsko', 'Chorvátsko': 'Chorvatsko', 'Srbsko': 'Srbsko', 'Slovinsko': 'Slovinsko',
  'Ukrajina': 'Ukrajina', 'Rusko': 'Rusko', 'Turecko': 'Turecko', 'Izrael': 'Izrael', 'Kanada': 'Kanada', 'Mexiko': 'Mexiko',
  'Brazília': 'Brazílie', 'Argentína': 'Argentina', 'Kolumbia': 'Kolumbie', 'Čile': 'Chile', 'Japonsko': 'Japonsko',
  'Južná Kórea': 'Jižní Korea', 'Čína': 'Čína', 'India': 'Indie', 'Thajsko': 'Thajsko', 'Hongkong': 'Hongkong', 'Taiwan': 'Tchaj-wan',
  'Filipíny': 'Filipíny', 'Indonézia': 'Indonésie', 'Vietnam': 'Vietnam', 'Austrália': 'Austrálie', 'Nový Zéland': 'Nový Zéland',
  'Juhoafrická republika': 'Jihoafrická republika', 'Egypt': 'Egypt', 'Maroko': 'Maroko', 'Nigéria': 'Nigérie', 'Island': 'Island',
  'Litva': 'Litva', 'Lotyšsko': 'Lotyšsko', 'Estónsko': 'Estonsko', 'Luxembursko': 'Lucembursko',
  // typy osôb
  'Herec': 'Herec', 'Účinkujúci': 'Účinkující', 'Režisér': 'Režisér', 'Producent': 'Producent', 'Tvorca': 'Tvůrce',
  'Scenárista': 'Scenárista', 'Spisovateľ': 'Spisovatel', 'Kameraman': 'Kameraman', 'Skladateľ': 'Skladatel', 'Casting': 'Casting',
  'Strihač': 'Střihač', 'Zvukár': 'Zvukař', 'Scénograf': 'Scénograf', 'Maskér': 'Maskér', 'Kostymér': 'Kostýmní výtvarník'
};

export function valueLabel(value: string): string {
  return CS[value] ?? value;
}

// Pre texty typu "Akčný, Dráma" (viac hodnôt oddelených čiarkou).
export function valueListLabel(list: string | null | undefined): string {
  if (!list) return '';
  return list.split(',').map((x) => valueLabel(x.trim())).join(', ');
}
