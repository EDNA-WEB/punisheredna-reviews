// Kolekcie filtra („rýchle výbery“) — rovnaké na webe aj v appke.
// Hodnoty žánrov/typov sú tak, ako sú uložené v databáze.
type L = { cs: string; sk: string; en: string };
export type FilterPreset = { key: string; icon: string; label: L; desc: L; params: Record<string, string> };

const year = new Date().getFullYear();

export const FILTER_PRESETS: FilterPreset[] = [
  { key: 'hidden', icon: 'gem', label: { cs: 'Skryté perly', sk: 'Skryté perly', en: 'Hidden gems' }, desc: { cs: 'Výborně hodnocené, méně známé tituly', sk: 'Výborne hodnotené, menej známe tituly', en: 'Highly rated, lesser-known titles' }, params: { ratingFrom: '75', minVotes: '50', maxVotes: '20000', sort: 'rating' } },
  { key: 'cult', icon: 'trophy', label: { cs: 'Kultovní klasika', sk: 'Kultová klasika', en: 'Cult classics' }, desc: { cs: 'Nejlepší filmy do roku 1999', sk: 'Najlepšie filmy do roku 1999', en: 'The best films up to 1999' }, params: { yearTo: '1999', ratingFrom: '80', minVotes: '5000', sort: 'rating' } },
  { key: 'fresh', icon: 'sparkle', label: { cs: 'Čerstvé novinky', sk: 'Čerstvé novinky', en: 'Fresh releases' }, desc: { cs: 'Tituly z posledních dvou let', sk: 'Tituly z posledných dvoch rokov', en: 'Titles from the last two years' }, params: { yearFrom: String(year - 1), sort: 'newest' } },
  { key: 'cinema', icon: 'ticket', label: { cs: 'Právě v kinech', sk: 'Práve v kinách', en: 'In cinemas' }, desc: { cs: 'Aktuální kinový program', sk: 'Aktuálny kinový program', en: 'Now showing in cinemas' }, params: { cinema: '1' } },
  { key: 'online', icon: 'play', label: { cs: 'Hned online', sk: 'Hneď online', en: 'Watch now' }, desc: { cs: 'Dostupné ke sledování online', sk: 'Dostupné na pozeranie online', en: 'Available to stream' }, params: { online: '1', ratingFrom: '65' } },
  { key: 'date', icon: 'heart', label: { cs: 'Na rande', sk: 'Na rande', en: 'Date night' }, desc: { cs: 'Romantika a komedie bez hororu', sk: 'Romantika a komédie bez hororu', en: 'Romance and comedy, no horror' }, params: { genres: 'Romantický,Komédia', exGenres: 'Horor', ratingFrom: '65' } },
  { key: 'family', icon: 'users', label: { cs: 'Pro celou rodinu', sk: 'Pre celú rodinu', en: 'Family night' }, desc: { cs: 'Rodinné a animované filmy', sk: 'Rodinné a animované filmy', en: 'Family and animated films' }, params: { genres: 'Rodinný,Animovaný', exGenres: 'Horor,Erotický', ratingFrom: '60' } },
  { key: 'thrill', icon: 'bolt', label: { cs: 'Napětí do konce', sk: 'Napätie do konca', en: 'Edge of your seat' }, desc: { cs: 'Thrillery, krimi a mysteriózní', sk: 'Thrillery, krimi a mysteriózne', en: 'Thrillers, crime and mystery' }, params: { genres: 'Thriller,Krimi,Mysteriózny', ratingFrom: '70' } },
  { key: 'short', icon: 'clock', label: { cs: 'Krátké na večer', sk: 'Krátke na večer', en: 'Short & good' }, desc: { cs: 'Kvalitní filmy do 100 minut', sk: 'Kvalitné filmy do 100 minút', en: 'Quality films under 100 minutes' }, params: { types: 'Film', lenTo: '100', ratingFrom: '70' } },
  { key: 'binge', icon: 'tv', label: { cs: 'Seriálové maratony', sk: 'Seriálové maratóny', en: 'Binge-worthy series' }, desc: { cs: 'Nejlépe hodnocené seriály', sk: 'Najlepšie hodnotené seriály', en: 'Top rated series' }, params: { types: 'Seriál', ratingFrom: '80', minVotes: '1000' } },
  { key: 'domestic', icon: 'flag', label: { cs: 'Domácí tvorba', sk: 'Domáca tvorba', en: 'Czech & Slovak productions' }, desc: { cs: 'Filmy českých a slovenských tvůrců', sk: 'Filmy českých a slovenských tvorcov', en: 'Made by Czech and Slovak filmmakers' }, params: { countries: 'Česko,Slovensko', countriesMode: 'primary' } },
  { key: 'czsk', icon: 'pin', label: { cs: 'Československá stopa', sk: 'Československá stopa', en: 'Czech & Slovak connection' }, desc: { cs: 'Zahraniční tituly s vazbou na Česko či Slovensko', sk: 'Zahraničné tituly s väzbou na Česko či Slovensko', en: 'Titles with a Czech or Slovak connection' }, params: { countries: 'Česko,Slovensko', countriesMode: 'secondary' } },
  { key: 'upcoming', icon: 'calendar', label: { cs: 'Chystá se', sk: 'Pripravuje sa', en: 'Coming soon' }, desc: { cs: 'Tituly s blížící se premiérou', sk: 'Tituly s blížiacou sa premiérou', en: 'Upcoming premieres' }, params: { upcoming: '1', sort: 'oldest' } }
];
