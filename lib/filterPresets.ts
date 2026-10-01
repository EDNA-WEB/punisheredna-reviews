// Hotové predvoľby filtra („rýchle výbery“) — rovnaké na webe aj v appke.
// Hodnoty žánrov/typov sú tak, ako sú uložené v databáze.
export type FilterPreset = { key: string; emoji: string; label: { cs: string; sk: string; en: string }; params: Record<string, string> };

const year = new Date().getFullYear();

export const FILTER_PRESETS: FilterPreset[] = [
  { key: 'hidden', emoji: '💎', label: { cs: 'Skryté perly', sk: 'Skryté perly', en: 'Hidden gems' }, params: { ratingFrom: '75', minVotes: '50', maxVotes: '20000', sort: 'rating' } },
  { key: 'cult', emoji: '🏆', label: { cs: 'Kultovní klasika', sk: 'Kultová klasika', en: 'Cult classics' }, params: { yearTo: '1999', ratingFrom: '80', minVotes: '5000', sort: 'rating' } },
  { key: 'fresh', emoji: '🆕', label: { cs: 'Čerstvé novinky', sk: 'Čerstvé novinky', en: 'Fresh releases' }, params: { yearFrom: String(year - 1), sort: 'newest' } },
  { key: 'cinema', emoji: '🎟️', label: { cs: 'Právě v kinech', sk: 'Práve v kinách', en: 'In cinemas' }, params: { cinema: '1' } },
  { key: 'online', emoji: '▶️', label: { cs: 'Hned online', sk: 'Hneď online', en: 'Watch now' }, params: { online: '1', ratingFrom: '65' } },
  { key: 'date', emoji: '💕', label: { cs: 'Na rande', sk: 'Na rande', en: 'Date night' }, params: { genres: 'Romantický,Komédia', exGenres: 'Horor', ratingFrom: '65' } },
  { key: 'family', emoji: '👨‍👩‍👧', label: { cs: 'Pro celou rodinu', sk: 'Pre celú rodinu', en: 'Family night' }, params: { genres: 'Rodinný,Animovaný', exGenres: 'Horor,Erotický', ratingFrom: '60' } },
  { key: 'thrill', emoji: '😱', label: { cs: 'Napětí do konce', sk: 'Napätie do konca', en: 'Edge of your seat' }, params: { genres: 'Thriller,Krimi,Mysteriózny', ratingFrom: '70' } },
  { key: 'laugh', emoji: '😂', label: { cs: 'Pořádně se zasmát', sk: 'Poriadne sa zasmiať', en: 'Big laughs' }, params: { genres: 'Komédia', exGenres: 'Dráma', ratingFrom: '65', minVotes: '500' } },
  { key: 'short', emoji: '⏱️', label: { cs: 'Krátké na večer', sk: 'Krátke na večer', en: 'Short & good' }, params: { types: 'Film', lenTo: '100', ratingFrom: '70' } },
  { key: 'epic', emoji: '🐉', label: { cs: 'Velké epické příběhy', sk: 'Veľké epické príbehy', en: 'Epic sagas' }, params: { lenFrom: '150', ratingFrom: '75' } },
  { key: 'binge', emoji: '📺', label: { cs: 'Seriálový maraton', sk: 'Seriálový maratón', en: 'Binge-worthy series' }, params: { types: 'Seriál', ratingFrom: '80', minVotes: '1000' } },
  { key: 'czsk', emoji: '🇨🇿', label: { cs: 'Česko-slovenské', sk: 'Česko-slovenské', en: 'Czech & Slovak' }, params: { countries: 'Česko,Slovensko', ratingFrom: '60' } },
  { key: 'upcoming', emoji: '🔜', label: { cs: 'Chystá se', sk: 'Pripravuje sa', en: 'Coming soon' }, params: { upcoming: '1', sort: 'oldest' } }
];
