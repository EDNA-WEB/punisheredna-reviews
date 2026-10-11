// Pomocné úpravy HTML článku (výstup z lib/markdown.ts → mdToHtml) pre nové
// zobrazenie článku (components/article/ArticleView.tsx):
//  • nadpisy <h2> dostanú id, aby sa na ne dalo skočiť z obsahu „V článku“
//  • text sa dá rozdeliť na dve časti, medzi ktoré sa vloží karta filmu

export type TocItem = { id: string; text: string };

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function slugify(text: string): string {
  const s = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || 'sekce';
}

// Doplní id k <h2> (mdToHtml generuje <h2> bez atribútov) a vráti obsah.
export function addHeadingIds(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const out = (html || '').replace(/<h2>([\s\S]*?)<\/h2>/g, (_m, inner: string) => {
    const text = plainText(inner);
    let id = `cast-${slugify(text)}`;
    let n = 2;
    while (used.has(id)) id = `cast-${slugify(text)}-${n++}`;
    used.add(id);
    if (text) toc.push({ id, text: text.length > 70 ? text.slice(0, 68).trim() + '…' : text });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: out, toc };
}

// Rozdelí HTML na dve časti za druhým odsekom najvyššej úrovne (mdToHtml
// nevnára odseky, takže stačí hľadať "</p>"). Pri krátkom článku ostane celý
// text v prvej časti a karta filmu sa zobrazí až za ním.
export function splitForInsert(html: string, afterParagraphs = 2): [string, string] {
  let idx = -1;
  let from = 0;
  for (let i = 0; i < afterParagraphs; i++) {
    const found = html.indexOf('</p>', from);
    if (found === -1) return [html, ''];
    idx = found + 4;
    from = idx;
  }
  // Ak by za touto pozíciou už nič nebolo, kartu daj na koniec.
  if (idx === -1 || idx >= html.length) return [html, ''];
  return [html.slice(0, idx), html.slice(idx)];
}
