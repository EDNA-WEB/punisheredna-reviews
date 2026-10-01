import { fold, getFilterOptions, getNameIndex } from './movieFilter';
import { valueLabel } from './valueLabels';

// ---------------------------------------------------------------------------
// CHYTRÉ HĽADANIE VETOU — z bežnej vety urobí filter:
//   „komedie z 90. let s Jimem Carreym nad 70 %“
//     → žáner Komédia · 1990–1999 · hrá Jim Carrey · hodnotenie 70 %+
//   „korejské thrillery na Netflixu bez hororu“
//     → krajina Južná Kórea · Thriller · Netflix · bez Hororu
// Rozumie češtine, slovenčine aj angličtine, skloňovaniu („s Jimem Carreym“)
// a nezáleží na diakritike. Čo nepochopí, ostane ako hľadaný názov.
// ---------------------------------------------------------------------------

type Patch = Record<string, string | string[] | boolean>;
export type SmartResult = { patch: Patch; chips: Array<{ kind: string; label: string }>; rest: string; understood: boolean };

// Ďalšie pomenovania žánrov (DB hodnota → slová; porovnáva sa začiatkom slova)
const GENRE_ALIASES: Record<string, string[]> = {
  'Akčný': ['akcni', 'akcny', 'akcne', 'akcnak', 'action'],
  'Dobrodružný': ['dobrodruz', 'adventure'],
  'Animovaný': ['animova', 'animak', 'animated', 'animation', 'kreslen'],
  'Biografický': ['biograf', 'biopic'],
  'Detský': ['detsk', 'dets', 'pro deti', 'pre deti', 'kids'],
  'Dokumentárny': ['dokument', 'documentar'],
  'Dráma': ['drama', 'dramat'],
  'Fantasy': ['fantasy', 'fantas'],
  'Historický': ['historick', 'historic', 'history'],
  'Horor': ['horor', 'horror', 'strasidel', 'desiv', 'scary'],
  'Hudobný': ['hudebn', 'hudobn', 'musical film', 'music film'],
  'Katastrofický': ['katastrof', 'disaster'],
  'Komédia': ['komed', 'comedy', 'vtipn', 'smesn', 'funny', 'humorn'],
  'Krimi': ['krimi', 'crime', 'kriminal', 'detektiv'],
  'Mysteriózny': ['mysterio', 'mystery', 'zahadn'],
  'Muzikál': ['muzikal', 'musical'],
  'Psychologický': ['psycholog'],
  'Rodinný': ['rodinn', 'family', 'pro celou rodinu', 'pre celu rodinu'],
  'Romantický': ['romanti', 'romance', 'romantic', 'na rande', 'zamilovan', 'laskav'],
  'Sci-Fi': ['sci-fi', 'scifi', 'sci fi', 'science fiction', 'vedeckofantast', 'vesmirn'],
  'Šport': ['sport', 'sportovn'],
  'Thriller': ['thriller', 'triler', 'napinav', 'napinat'],
  'Vojnový': ['valecn', 'vojnov', 'war film', 'war movie'],
  'Western': ['western'],
  'Životopisný': ['zivotopis'],
  'Anime': ['anime'],
  'Noir': ['noir'],
  'Pohádka': ['pohad', 'rozpravk', 'fairy']
};

const COUNTRY_ALIASES: Record<string, string[]> = {
  USA: ['americ', 'usa', 'hollywood', 'american'],
  'Česko': ['cesk', 'czech', 'cesko'],
  'Slovensko': ['slovens', 'slovak'],
  'Veľká Británia': ['britsk', 'anglick', 'british', 'english', 'uk'],
  'Francúzsko': ['francouz', 'francuz', 'french', 'franci'],
  'Nemecko': ['nemeck', 'nemec', 'german'],
  'Taliansko': ['italsk', 'talian', 'italian', 'itali'],
  'Španielsko': ['spanel', 'spaniel', 'spanish'],
  'Japonsko': ['japons', 'japan'],
  'Južná Kórea': ['korej', 'korea', 'jihokorej', 'juhokorej'],
  'Čína': ['cinsk', 'chines', 'cina'],
  'India': ['indick', 'indian', 'bollywood'],
  'Poľsko': ['polsk', 'polish'],
  'Rusko': ['rusk', 'russian'],
  'Švédsko': ['svedsk', 'swedish'],
  'Dánsko': ['dansk', 'danish'],
  'Nórsko': ['norsk', 'norweg'],
  'Kanada': ['kanad', 'canad'],
  'Austrália': ['austral'],
  'Mexiko': ['mexic', 'mexik'],
  'Turecko': ['turec', 'turkish'],
  'Maďarsko': ['madar', 'hungar'],
  'Írsko': ['irsk', 'irish']
};

const TYPE_ALIASES: Record<string, string[]> = {
  'Seriál': ['serial', 'serialy', 'serialu', 'series', 'tv show', 'show'],
  Film: ['film', 'filmy', 'filmu', 'filmov', 'movie', 'movies'],
  'TV film': ['tv film', 'televizni film', 'televizny film']
};

const STOP = new Set(
  'a i aj s se so z ze zo od do na v vo ve o the of with from and or nebo alebo co ktere ktore nejake nejaky nejaku chci chcem chcu najdi najdi hledam hladam mi me pro pre ktery ktory jsou su je by please show give ukaz ukaz'.split(' ')
);

const WORD_NUMBERS: Record<string, number> = { sedesat: 60, sedemdesiat: 70, sedmdesat: 70, osmdesat: 80, osemdesiat: 80, devadesat: 90, devatdesiat: 90 };

type Tok = { w: string; used: boolean };

function stemMatch(token: string, alias: string) {
  // alias je začiatok slova (napr. „komed“) — sedí na „komedie“, „komédiu“…
  return token.startsWith(alias) || (alias.length >= 6 && token.length >= 5 && alias.startsWith(token));
}

export async function parseSmartQuery(raw: string): Promise<SmartResult> {
  const text = fold(raw).replace(/[,;!?]/g, ' ').replace(/\s+/g, ' ').trim();
  const patch: Patch = {};
  const chips: SmartResult['chips'] = [];
  if (!text) return { patch, chips, rest: '', understood: false };

  const toks: Tok[] = text.split(' ').map((w) => ({ w, used: false }));
  const options = await getFilterOptions();
  const now = new Date().getFullYear();

  const add = (key: string, value: string) => {
    const list = (patch[key] as string[]) || [];
    if (!list.includes(value)) patch[key] = [...list, value];
  };
  const useRange = (from: number, to: number) => toks.slice(from, to).forEach((t) => (t.used = true));

  // Viacslovné spojenia (napr. „na rande“, „pro deti“) — hľadáme v celom texte
  const phrase = (p: string) => {
    const words = p.split(' ');
    for (let i = 0; i + words.length <= toks.length; i++) {
      if (words.every((w, j) => !toks[i + j].used && stemMatch(toks[i + j].w, w))) return i;
    }
    return -1;
  };

  // --- Čísla: hodnotenie, roky, desaťročia, dĺžka -----------------------------
  const joined = toks.map((t) => t.w);
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i].w;
    // 70 % / 70% / 70%+
    const pct = w.match(/^(\d{1,3})%\+?$/) || (toks[i + 1]?.w.match(/^%\+?$/) && w.match(/^(\d{1,3})$/));
    if (pct && !toks[i].used) {
      const v = Math.min(99, Number(pct[1]));
      patch.ratingFrom = String(v);
      chips.push({ kind: 'rating', label: `${v} %+` });
      toks[i].used = true;
      if (toks[i + 1]?.w.startsWith('%')) toks[i + 1].used = true;
      if (i > 0 && /^(nad|aspon|aspoň|od|min|minimalne|over|above|vic|viac)/.test(toks[i - 1].w)) toks[i - 1].used = true;
      continue;
    }
    // desaťročie: 90s, 90., 90-te, „90. let“
    const dec = w.match(/^(\d0)(s|\.|te|tych|tych|ky)?$/);
    if (dec && !toks[i].used && (dec[2] || /^(let|leta|roky|rokov|rokoch|years)$/.test(toks[i + 1]?.w || ''))) {
      const d = Number(dec[1]);
      const from = d >= 30 ? 1900 + d : 2000 + d;
      patch.yearFrom = String(from);
      patch.yearTo = String(from + 9);
      chips.push({ kind: 'year', label: `${from}–${from + 9}` });
      toks[i].used = true;
      if (/^(let|leta|roky|rokov|rokoch|years)$/.test(toks[i + 1]?.w || '')) toks[i + 1].used = true;
      continue;
    }
    const wordDec = Object.keys(WORD_NUMBERS).find((k) => w.startsWith(k));
    if (wordDec && !toks[i].used) {
      const from = 1900 + WORD_NUMBERS[wordDec];
      patch.yearFrom = String(from);
      patch.yearTo = String(from + 9);
      chips.push({ kind: 'year', label: `${from}–${from + 9}` });
      toks[i].used = true;
      if (/^(let|leta|roky|rokov|rokoch)$/.test(toks[i + 1]?.w || '')) toks[i + 1].used = true;
      continue;
    }
    // rozsah rokov 2010-2015
    const range = w.match(/^(19\d{2}|20\d{2})-(19\d{2}|20\d{2})$/);
    if (range && !toks[i].used) {
      patch.yearFrom = range[1];
      patch.yearTo = range[2];
      chips.push({ kind: 'year', label: `${range[1]}–${range[2]}` });
      toks[i].used = true;
      continue;
    }
    // rok (s predložkou: po / od / pred / do)
    const yr = w.match(/^(19\d{2}|20\d{2})$/);
    if (yr && !toks[i].used) {
      const y = yr[1];
      const prev = [toks[i - 1]?.w, toks[i - 2]?.w].filter(Boolean) as string[];
      if (prev.some((p) => /^(po|od|after|since|novejsi|novsie)$/.test(p))) {
        patch.yearFrom = y;
        chips.push({ kind: 'year', label: `${y}+` });
      } else if (prev.some((p) => /^(pred|before|starsi|do)$/.test(p))) {
        patch.yearTo = y;
        chips.push({ kind: 'year', label: `–${y}` });
      } else if (toks[i + 1] && /^(az|až|-|to)$/.test(toks[i + 1].w) && /^(19|20)\d{2}$/.test(toks[i + 2]?.w || '')) {
        patch.yearFrom = y;
        patch.yearTo = toks[i + 2].w;
        chips.push({ kind: 'year', label: `${y}–${toks[i + 2].w}` });
        useRange(i + 1, i + 3);
      } else {
        patch.yearFrom = y;
        patch.yearTo = y;
        chips.push({ kind: 'year', label: y });
      }
      toks[i].used = true;
      for (let k = i - 1; k >= Math.max(0, i - 2); k--) if (/^(po|od|pred|do|roku|roce|rok|z|ze|zo|after|before|since|in|from)$/.test(toks[k].w)) toks[k].used = true;
      continue;
    }
    // dĺžka: „do 90 min“, „nad 2 hodiny“
    const mins = w.match(/^(\d{2,3})$/) && /^(min|minut|minuty|minutach|minutes)/.test(toks[i + 1]?.w || '');
    if (mins && !toks[i].used) {
      const v = Number(w);
      if (/^(nad|viac|vic|delsi|dlhsi|over|longer)/.test(toks[i - 1]?.w || '')) patch.lenFrom = String(v);
      else patch.lenTo = String(v);
      chips.push({ kind: 'length', label: patch.lenFrom ? `${v}+ min` : `≤ ${v} min` });
      useRange(Math.max(0, i - 1), i + 2);
      continue;
    }
    const hrs = w.match(/^(\d)$/) && /^(hod|h$|hours)/.test(toks[i + 1]?.w || '');
    if (hrs && !toks[i].used) {
      const v = Number(w) * 60;
      if (/^(nad|viac|vic|delsi|dlhsi|over)/.test(toks[i - 1]?.w || '')) patch.lenFrom = String(v);
      else patch.lenTo = String(v);
      chips.push({ kind: 'length', label: patch.lenFrom ? `${v / 60}+ h` : `≤ ${v / 60} h` });
      useRange(Math.max(0, i - 1), i + 2);
      continue;
    }
  }
  void joined;

  // --- Slová s významom --------------------------------------------------------
  const keyword = (re: RegExp, apply: () => void) => {
    const t = toks.find((x) => !x.used && re.test(x.w));
    if (t) {
      t.used = true;
      apply();
    }
  };
  keyword(/^(kratk|kratsi|short)/, () => {
    patch.lenTo = patch.lenTo || '100';
    chips.push({ kind: 'length', label: '≤ 100 min' });
  });
  keyword(/^(dlouh|dlh|epick|long)/, () => {
    patch.lenFrom = patch.lenFrom || '150';
    chips.push({ kind: 'length', label: '150+ min' });
  });
  keyword(/^(nejlep|najlep|top|best|nejlepe|najlepsie|kvalitn)/, () => {
    patch.sort = 'rating';
    patch.minVotes = patch.minVotes || '100';
    chips.push({ kind: 'sort', label: 'Nejlépe hodnocené' });
  });
  keyword(/^(nejhors|najhors|worst)/, () => {
    patch.sort = 'worst';
    chips.push({ kind: 'sort', label: 'Nejhůře hodnocené' });
  });
  keyword(/^(nov|nejnov|najnov|novink|latest|new)/, () => {
    if (!patch.yearFrom) patch.yearFrom = String(now - 1);
    patch.sort = 'newest';
    chips.push({ kind: 'year', label: `${now - 1}+` });
  });
  keyword(/^(stare|stary|staré|klasik|classic|kultov|cult)/, () => {
    if (!patch.yearTo) patch.yearTo = '1999';
    patch.ratingFrom = patch.ratingFrom || '75';
    chips.push({ kind: 'year', label: '–1999' });
  });
  keyword(/^(neznam|skryt|hidden|malo zna)/, () => {
    patch.maxVotes = '20000';
    patch.ratingFrom = patch.ratingFrom || '72';
    chips.push({ kind: 'special', label: 'Skryté perly' });
  });
  keyword(/^(popular|znam|slavn|famous)/, () => {
    patch.sort = 'popular';
  });
  const cinemaAt = phrase('v kin') >= 0 ? phrase('v kin') : phrase('in cinem');
  if (cinemaAt >= 0) {
    useRange(cinemaAt, cinemaAt + 2);
    patch.cinema = true;
    chips.push({ kind: 'where', label: 'V kině' });
  }
  keyword(/^(kino|kinach|kinech|cinema)$/, () => {
    patch.cinema = true;
    chips.push({ kind: 'where', label: 'V kině' });
  });
  keyword(/^online$/, () => {
    patch.online = true;
    chips.push({ kind: 'where', label: 'Online' });
  });
  keyword(/^(titulk|subtit)/, () => {
    patch.subs = true;
    chips.push({ kind: 'where', label: 'Titulky' });
  });
  keyword(/^(dabing|dabova|dubbed|dabovan)/, () => {
    patch.dub = true;
    chips.push({ kind: 'where', label: 'Dabing' });
  });
  keyword(/^(nevidel|nevid|unseen)/, () => {
    patch.hideSeen = true;
    chips.push({ kind: 'mine', label: 'Bez viděných' });
  });

  // Streamovacie služby (podľa ich názvu)
  for (const sv of options.services) {
    const n = fold(sv.name).replace(/[^a-z0-9]+/g, ' ').trim();
    const first = n.split(' ')[0];
    if (first.length < 3) continue;
    const t = toks.find((x) => !x.used && (x.w.replace(/[^a-z0-9]/g, '').startsWith(first.slice(0, Math.max(3, first.length - 1)))));
    if (t) {
      t.used = true;
      add('services', sv.id);
      chips.push({ kind: 'where', label: sv.name });
    }
  }

  // „bez hororu“ / „ne horor“ / „without horror“ → vylúčiť žáner
  for (let i = 0; i < toks.length - 1; i++) {
    if (toks[i].used || !/^(bez|ne|without|no)$/.test(toks[i].w)) continue;
    const next = toks[i + 1];
    for (const [genre, aliases] of Object.entries(GENRE_ALIASES)) {
      if (!options.genres[genre]) continue;
      if (aliases.some((a) => !a.includes(' ') && stemMatch(next.w, a)) || stemMatch(next.w, fold(genre).slice(0, 5))) {
        add('exGenres', genre);
        chips.push({ kind: 'exgenre', label: `bez: ${valueLabel(genre)}` });
        toks[i].used = true;
        next.used = true;
        break;
      }
    }
  }

  // Žánre (aj viacslovné spojenia)
  for (const [genre, aliases] of Object.entries(GENRE_ALIASES)) {
    if (!options.genres[genre]) continue;
    for (const a of aliases) {
      if (a.includes(' ')) {
        const at = phrase(a);
        if (at >= 0) {
          useRange(at, at + a.split(' ').length);
          add('genres', genre);
          break;
        }
      } else {
        const t = toks.find((x) => !x.used && stemMatch(x.w, a));
        if (t) {
          t.used = true;
          add('genres', genre);
          break;
        }
      }
    }
  }
  // Ostatné žánre z databázy podľa ich vlastného (aj českého) názvu
  for (const genre of Object.keys(options.genres)) {
    if ((patch.genres as string[] | undefined)?.includes(genre) || (patch.exGenres as string[] | undefined)?.includes(genre)) continue;
    const forms = [fold(genre), fold(valueLabel(genre))].map((f) => f.slice(0, Math.max(4, f.length - 2)));
    const t = toks.find((x) => !x.used && x.w.length >= 4 && forms.some((f) => x.w.startsWith(f)));
    if (t) {
      t.used = true;
      add('genres', genre);
    }
  }
  ((patch.genres as string[]) || []).forEach((g) => chips.push({ kind: 'genre', label: valueLabel(g) }));
  if (((patch.genres as string[]) || []).length > 1 && toks.some((t) => /^(a|and|aj|i)$/.test(t.w))) patch.genresMode = 'all';

  // Krajiny
  for (const [country, aliases] of Object.entries(COUNTRY_ALIASES)) {
    if (!options.countries[country]) continue;
    const t = toks.find((x) => !x.used && x.w.length >= 2 && aliases.some((a) => (a.length <= 3 ? x.w === a : stemMatch(x.w, a))));
    if (t) {
      t.used = true;
      add('countries', country);
      chips.push({ kind: 'country', label: valueLabel(country) });
    }
  }
  for (const country of Object.keys(options.countries)) {
    if ((patch.countries as string[] | undefined)?.includes(country)) continue;
    const forms = [fold(country), fold(valueLabel(country))].filter((f) => f.length >= 4).map((f) => f.slice(0, Math.max(4, f.length - 2)));
    const t = toks.find((x) => !x.used && x.w.length >= 4 && forms.some((f) => x.w.startsWith(f)));
    if (t) {
      t.used = true;
      add('countries', country);
      chips.push({ kind: 'country', label: valueLabel(country) });
    }
  }

  // Typ (seriál / film) — „film“ len keď sa pochopilo aj niečo iné
  for (const [type, aliases] of Object.entries(TYPE_ALIASES)) {
    if (!options.types[type]) continue;
    for (const a of aliases) {
      const at = a.includes(' ') ? phrase(a) : toks.findIndex((x) => !x.used && x.w === a);
      if (at >= 0) {
        if (type === 'Film' && Object.keys(patch).length === 0) continue;
        useRange(at, at + a.split(' ').length);
        add('types', type);
        chips.push({ kind: 'type', label: valueLabel(type) });
        break;
      }
    }
  }

  // Ľudia: „s Jimem Carreym“, „hraje Tom Hanks“, „režie Nolan“, „od Tarantina“
  const [actors, directors] = await Promise.all([getNameIndex('actor'), getNameIndex('director')]);
  const nameMatch = (index: Array<{ name: string; f: string; count: number }>, start: number, allowSingle: boolean) => {
    // skúsi 3- a 2-slovné mená, potom priezvisko samotné
    for (const len of allowSingle ? [3, 2, 1] : [3, 2]) {
      const slice = toks.slice(start, start + len);
      if (slice.length < len || slice.some((t) => t.used || STOP.has(t.w) || t.w.length < 2)) continue;
      const hit = index.find((e) => {
        const parts = e.f.split(' ').filter(Boolean);
        if (len === 1) return parts.length >= 2 && e.count >= 2 && slice[0].w.length >= 4 && stemMatch(slice[0].w, parts[parts.length - 1].slice(0, Math.max(4, parts[parts.length - 1].length - 1)));
        if (parts.length !== len) return false;
        return parts.every((p, j) => stemMatch(slice[j].w, p.slice(0, Math.max(3, p.length - 1))));
      });
      if (hit) return { hit, len };
    }
    return null;
  };
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].used || STOP.has(toks[i].w)) continue;
    const prev = toks[i - 1]?.w || '';
    const wantsDirector = /^(rezie|rezia|rezisera|reziser|reziséra|directed|director|by|od)$/.test(prev);
    // Samotné priezvisko len po slove ako „s“, „hraje“, „režie“ — aby sa
    // názov filmu (napr. „Harry Potter“) nepomýlil s menom herca.
    const cue = wantsDirector || /^(s|se|so|with|hraje|hra|hrajou|hraju|starring)$/.test(prev);
    const order = wantsDirector ? [directors, actors] : [actors, directors];
    for (const idx of order) {
      const found = nameMatch(idx, i, cue);
      if (!found) continue;
      const isDirector = idx === directors;
      if (isDirector) {
        patch.director = found.hit.name;
        chips.push({ kind: 'person', label: `Režie: ${found.hit.name}` });
      } else {
        add('actors', found.hit.name);
        chips.push({ kind: 'person', label: `Hraje: ${found.hit.name}` });
      }
      useRange(i, i + found.len);
      if (i > 0 && /^(s|se|so|with|hraje|hra|starring|rezie|rezia|reziser|by|od|directed)$/.test(prev)) toks[i - 1].used = true;
      break;
    }
  }

  const understood = chips.length > 0;
  // Nepochopené slová = hľadaný názov (bez výplňových slov, ak sme niečo pochopili)
  const rest = toks
    .filter((t) => !t.used && !(understood && STOP.has(t.w)))
    .map((t) => t.w)
    .join(' ')
    .trim();
  return { patch, chips, rest: understood ? rest : raw.trim(), understood };
}
