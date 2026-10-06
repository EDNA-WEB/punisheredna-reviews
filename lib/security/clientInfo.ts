// Zistenie IP adresy a zariadenia z aktuálnej požiadavky (Vercel posiela
// skutočnú IP návštevníka v hlavičkách x-forwarded-for / x-real-ip).
type HeaderLike = { get(name: string): string | null };

export function ipFromHeaders(h: HeaderLike | null | undefined): string | null {
  if (!h) return null;
  const raw =
    (h.get('x-vercel-forwarded-for') || '').split(',')[0].trim() ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    (h.get('x-real-ip') || '').trim();
  return raw ? raw.slice(0, 64) : null;
}

export function uaFromHeaders(h: HeaderLike | null | undefined): string | null {
  const ua = h?.get('user-agent') || '';
  return ua ? ua.slice(0, 400) : null;
}

// Hlavičky aktuálnej požiadavky — mimo požiadavky (cron, build) vráti null.
export async function currentHeaders(): Promise<HeaderLike | null> {
  try {
    const { headers } = await import('next/headers');
    return await headers();
  } catch {
    return null;
  }
}

// Krátky popis zariadenia na zobrazenie v administrácii („Chrome · Windows“).
export function describeDevice(ua: string | null | undefined): string {
  const s = ua || '';
  if (!s) return '—';
  if (/okhttp|expo|cfnetwork|darwin/i.test(s) && !/mozilla/i.test(s)) return /android|okhttp/i.test(s) ? 'Appka · Android' : 'Appka · iOS';
  const os = /windows/i.test(s) ? 'Windows' : /iphone|ipad/i.test(s) ? 'iOS' : /android/i.test(s) ? 'Android' : /mac os/i.test(s) ? 'macOS' : /linux/i.test(s) ? 'Linux' : 'Jiný systém';
  const br = /edg\//i.test(s) ? 'Edge' : /opr\//i.test(s) ? 'Opera' : /firefox/i.test(s) ? 'Firefox' : /chrome|crios/i.test(s) ? 'Chrome' : /safari/i.test(s) ? 'Safari' : 'Prohlížeč';
  return `${br} · ${os}`;
}

export function maskIp(ip: string | null | undefined): string {
  if (!ip) return '—';
  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean);
    return `${parts.slice(0, 2).join(':')}:xxxx:…`;
  }
  const p = ip.split('.');
  return p.length === 4 ? `${p[0]}.${p[1]}.xxx.xxx` : 'xxx';
}
