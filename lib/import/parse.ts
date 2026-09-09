import { ImportItem, PremiereInput } from './types';

/**
 * Jednoduchý RFC4180 CSV parser (žiadna externá závislosť).
 * Zvláda úvodzovky, čiarky vnútri úvodzoviek aj escapované "" úvodzovky.
 */
function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') pushField();
      else if (c === '\r') {
        /* ignoruj, riadok ukončí \n */
      } else if (c === '\n') pushRow();
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

/** Viac hodnôt v jednom stĺpci oddelených bodkočiarkou, napr. "akčný;dráma" */
function splitEntries(value: string): string[] {
  return value
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Formát CSV (hlavička, presné názvy stĺpcov, ostatné okrem title/year sú voliteľné):
 *
 * title,year,tags,where_to_watch,premiere_kino,premiere_vod,premiere_dvd,premiere_country,premiere_distributor
 * Duna: Časť druhá,2024,"sci-fi;akčný","Netflix|https://netflix.com/...;HBO Max|https://hbomax.com/...",2024-02-29,2024-05-15,,SK,Continental
 *
 * - tags: názvy tagov oddelené ";"
 * - where_to_watch: záznamy oddelené ";", v tvare "Platforma|URL"
 * - premiere_kino / premiere_vod / premiere_dvd: dátum ISO (YYYY-MM-DD), stĺpec nechajte prázdny ak sa netýka
 * - premiere_country / premiere_distributor: platí pre všetky vyplnené premiéry v danom riadku
 */
export function parseCsvToItems(text: string): ImportItem[] {
  const rows = parseCsvLines(text);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const iTitle = idx('title');
  const iYear = idx('year');
  const iTags = idx('tags');
  const iWhereToWatch = idx('where_to_watch');
  const iPremiereKino = idx('premiere_kino');
  const iPremiereVod = idx('premiere_vod');
  const iPremiereDvd = idx('premiere_dvd');
  const iPremiereCountry = idx('premiere_country');
  const iPremiereDistributor = idx('premiere_distributor');

  if (iTitle === -1 || iYear === -1) {
    throw new Error("CSV musí obsahovať aspoň stĺpce 'title' a 'year'.");
  }

  return rows.slice(1).map((cols): ImportItem => {
    const item: ImportItem = {
      title: (cols[iTitle] || '').trim(),
      year: parseInt(cols[iYear], 10)
    };

    if (iTags !== -1 && cols[iTags]) {
      item.tags = splitEntries(cols[iTags]);
    }

    if (iWhereToWatch !== -1 && cols[iWhereToWatch]) {
      item.whereToWatch = splitEntries(cols[iWhereToWatch]).map((entry) => {
        const [platform, url] = entry.split('|').map((s) => s.trim());
        return { platform, url };
      });
    }

    const premieres: PremiereInput[] = [];
    const country = iPremiereCountry !== -1 ? cols[iPremiereCountry]?.trim() || undefined : undefined;
    const distributor =
      iPremiereDistributor !== -1 ? cols[iPremiereDistributor]?.trim() || undefined : undefined;

    if (iPremiereKino !== -1 && cols[iPremiereKino]?.trim()) {
      premieres.push({ type: 'KINO', date: cols[iPremiereKino].trim(), country, distributor });
    }
    if (iPremiereVod !== -1 && cols[iPremiereVod]?.trim()) {
      premieres.push({ type: 'VOD', date: cols[iPremiereVod].trim(), country, distributor });
    }
    if (iPremiereDvd !== -1 && cols[iPremiereDvd]?.trim()) {
      premieres.push({ type: 'DVD_BLURAY', date: cols[iPremiereDvd].trim(), country, distributor });
    }
    if (premieres.length > 0) item.premieres = premieres;

    return item;
  });
}

/**
 * Formát JSON: pole objektov, napr.:
 * [
 *   {
 *     "title": "Duna: Časť druhá",
 *     "year": 2024,
 *     "tags": ["sci-fi", "akčný"],
 *     "whereToWatch": [{ "platform": "Netflix", "url": "https://..." }],
 *     "premieres": [{ "type": "KINO", "date": "2024-02-29", "country": "SK", "distributor": "Continental" }]
 *   }
 * ]
 */
export function parseImportFile(text: string, format: 'json' | 'csv'): ImportItem[] {
  if (format === 'json') {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON musí byť pole objektov (jeden objekt = jeden film/seriál).');
    }
    return parsed as ImportItem[];
  }
  return parseCsvToItems(text);
}
