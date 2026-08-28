export function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Bezpečný, jednoduchý prevod markdownu na HTML. Vstup sa vždy najprv escapuje
// (žiadne skutočné HTML/skripty sa vložiť nedajú), až POTOM sa v ňom hľadajú
// bezpečné vzory (odkaz musí začínať na "/" alebo "http(s)://", nič iné).
//
// Podporované: **hrubé**, *kurzíva*, ## nadpis, ### podnadpis, > citácia,
// - zoznam, ![popis](obrázok), [text](odkaz), [[youtube:odkaz alebo ID]] video.
export function mdToHtml(input: string): string {
  if (!input) return '';
  const lines = input.split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  function extractYoutubeId(raw: string): string | null {
    const direct = raw.match(/^[\w-]{11}$/);
    if (direct) return direct[0];
    return youtubeVideoId(raw);
  }

  function flushParagraph() {
    if (paragraph.length > 0) {
      out.push(`<p>${paragraph.join('<br />')}</p>`);
      paragraph = [];
    }
  }
  function flushList() {
    if (listItems.length > 0) {
      out.push(`<ul>${listItems.join('')}</ul>`);
      listItems = [];
    }
  }

  function inlineFormat(raw: string): string {
    let h = escapeHtml(raw);
    // obrázok — musí ísť pred odkazom (podobná syntax, "!" na začiatku ich odlíši)
    h = h.replace(/!\[([^\]]*)\]\((\/[^\s)]+|https?:\/\/[^\s)]+|data:image\/[a-zA-Z+]+;base64,[^\s)]+)\)/g, (_m, alt, src) => {
      return `<img src="${src}" alt="${alt}" class="w-full rounded-xl my-4" loading="lazy" />`;
    });
    // odkaz — povolené len interné cesty (/…) alebo http(s)://, nič iné (žiadne javascript: a pod.)
    h = h.replace(/\[([^\]]+)\]\((\/[^\s)]+|https?:\/\/[^\s)]+)\)/g, (_m, text, href) => {
      const external = href.startsWith('http');
      return `<a href="${href}" class="text-accent font-semibold hover:underline"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
    });
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return h;
  }

  for (const line of lines) {
    const youtubeMatch = line.trim().match(/^\[\[youtube:(.+)\]\]$/);
    if (youtubeMatch) {
      flushParagraph();
      flushList();
      const videoId = extractYoutubeId(youtubeMatch[1].trim());
      if (videoId) {
        out.push(
          `<div class="relative rounded-xl overflow-hidden bg-night my-4" style="aspect-ratio:16/9"><iframe src="https://www.youtube.com/embed/${videoId}" class="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
        );
      }
    } else if (/^###\s+/.test(line)) {
      flushParagraph();
      flushList();
      out.push(`<h3>${inlineFormat(line.replace(/^###\s+/, ''))}</h3>`);
    } else if (/^##\s+/.test(line)) {
      flushParagraph();
      flushList();
      out.push(`<h2>${inlineFormat(line.replace(/^##\s+/, ''))}</h2>`);
    } else if (/^>\s+/.test(line)) {
      flushParagraph();
      flushList();
      out.push(`<blockquote>${inlineFormat(line.replace(/^>\s+/, ''))}</blockquote>`);
    } else if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      listItems.push(`<li>${inlineFormat(line.replace(/^[-*]\s+/, ''))}</li>`);
    } else if (line.trim() === '') {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(inlineFormat(line));
    }
  }
  flushParagraph();
  flushList();
  return out.join('');
}

export function excerpt(input: string, n = 160): string {
  const plain = (input || '')
    .replace(/\[\[youtube:[^\]]+\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  return plain.length > n ? plain.slice(0, n).trim() + '…' : plain;
}

export function readingTime(input: string): number {
  const words = (input || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function youtubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

export function youtubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([\w-]{11})/, // youtube.com/watch?...&v=ID — funguje bez ohľadu na poradie parametrov v URL
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
