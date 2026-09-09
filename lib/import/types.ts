// Typy pre hromadný import filmov/seriálov.
// POZN.: názvy polí (title, year, tags, whereToWatch, premieres) sú navrhnuté podľa
// vášho popisu dátového modelu. Ak sa vo vašom prisma/schema.prisma volajú inak
// (napr. Film namiesto Movie, releaseDate namiesto date a pod.), stačí premenovať
// tu a v processImport.ts — zvyšok (parsovanie CSV/JSON, UI) sa meniť nemusí.

export interface WhereToWatchInput {
  /** Názov platformy, napr. "Netflix", "Prime Video" */
  platform: string;
  /** Odkaz na sledovanie */
  url: string;
}

export interface PremiereInput {
  /** Typ premiéry — uprav podľa enumu vo vašej schéme (napr. ReleaseType) */
  type: 'KINO' | 'VOD' | 'DVD_BLURAY' | string;
  /** Dátum v ISO tvare, napr. "2026-03-12" */
  date: string;
  country?: string;
  distributor?: string;
}

export interface ImportItem {
  title: string;
  year: number;
  /** Zoznam názvov tagov, napr. ["akčný", "návrat hrdinu"] */
  tags?: string[];
  whereToWatch?: WhereToWatchInput[];
  premieres?: PremiereInput[];
}

export interface ImportRowResult {
  /** Číslo riadku pre CSV (2 = prvý dátový riadok), alebo index+1 pre JSON */
  row: number;
  title: string;
  year: number | null;
  status: 'updated' | 'not_found' | 'error';
  message?: string;
}
