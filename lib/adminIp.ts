import { ipFromHeaders } from './security/clientInfo';

type HeaderLike = { get(name: string): string | null };

// Voliteľné: ADMIN_ALLOWED_IPS = "1.2.3.4, 5.6.7.8" → administrátorské práva
// platia len z týchto IP adries — na webe, v appke aj v spoločných admin
// cestách. Mimo nich sa admin správa ako bežný používateľ.
// Prázdne / nenastavené = bez obmedzenia.
export function adminIpAllowed(h: HeaderLike | null | undefined): boolean {
  const list = (process.env.ADMIN_ALLOWED_IPS || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (list.length === 0) return true;
  const ip = ipFromHeaders(h);
  return !!ip && list.includes(ip);
}
