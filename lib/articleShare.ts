import crypto from 'crypto';
import { purposeSecret, verifyKeys } from './secrets';
import { headers } from 'next/headers';
import { prisma } from './prisma';
import { memo, memoForget } from './memoCache';

// ---------------------------------------------------------------------------
// Dočasné zdieľanie článkov verejnosti (Administrace → Sdílení článků).
//  • odkaz obsahuje TAJNÝ KĽÚČ (?k=…) viazaný na konkrétny článok — bez neho
//    sa nič nezobrazí, takže iný článok sa nedá „uhádnuť“
//  • kľúče sa dajú naraz zneplatniť (nová „soľ“) a celé zdieľanie vypnúť
//  • obrázky sa podávajú cez našu adresu /sdilet/img/… — návštevník nevidí,
//    že sú uložené v Cloudinary (ani v TMDb)
//  • každé otvorenie sa zapíše do štatistiky (bez robotov a náhľadov odkazov)
// ---------------------------------------------------------------------------

export type ShareType = 'news' | 'blog';

export async function getShareConfig() {
  return memo('articleShare:config', 20_000, async () => {
    const s = await prisma.settings.findUnique({ where: { id: 'singleton' }, select: { articleShareEnabled: true, articleShareSalt: true } });
    return { enabled: !!s?.articleShareEnabled, salt: s?.articleShareSalt || 'v1' };
  });
}

export async function isArticleShareEnabled() {
  return (await getShareConfig()).enabled;
}

export function forgetShareConfig() {
  memoForget('articleShare:');
}

// Vlastný kľúč pre zdieľanie (lib/secrets.ts); starý kľúč platí počas prechodného obdobia.
function hmac(data: string, key: string = purposeSecret('share')) {
  return crypto.createHmac('sha256', key).update(data).digest('base64url');
}

// Kľúč pre jeden článok (novinka podľa slugu, blog podľa id). Voliteľné
// „umiestnenie“ (tag, napr. 'csfd-diskuse-film-x') je súčasťou podpisu —
// zdroj návštevy sa tak nedá podvrhnúť úpravou adresy.
export function shareKey(type: ShareType, ref: string, salt: string, tag?: string | null, key?: string) {
  return hmac(tag ? `share:${salt}:${type}:${ref}:${tag}` : `share:${salt}:${type}:${ref}`, key).slice(0, 22);
}

export async function verifyShareKey(type: ShareType, ref: string, key: string | undefined | null, tag?: string | null) {
  if (!key || typeof key !== 'string' || key.length !== 22) return false;
  const { salt } = await getShareConfig();
  const b = Buffer.from(key);
  for (const k of verifyKeys('share')) {
    const a = Buffer.from(shareKey(type, ref, salt, tag, k));
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

// Odkazy v texte článku → obyčajný text (návštevník sa nesmie preklikať ďalej)
export function neutralizeLinks(html: string) {
  return html.replace(/<a\b[^>]*>/gi, '<span class="shared-link">').replace(/<\/a>/gi, '</span>');
}

// --- Obrázky cez našu adresu ---------------------------------------------------

const IMAGE_HOSTS = ['res.cloudinary.com', 'image.tmdb.org', 'img.youtube.com', 'i.ytimg.com'];

function allowedImage(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && IMAGE_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

export function proxiedImage(url: string | null | undefined) {
  if (!url) return null;
  if (!allowedImage(url)) return url;
  const enc = Buffer.from(url).toString('base64url');
  return `/sdilet/img/${enc}.${hmac(`img:${url}`).slice(0, 16)}`;
}

export function decodeImageToken(token: string) {
  const dot = token.lastIndexOf('.');
  if (dot < 1 || token.length > 2000) return null;
  const enc = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let url: string;
  try {
    url = Buffer.from(enc, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (!allowedImage(url)) return null;
  const expected = Buffer.from(hmac(`img:${url}`).slice(0, 16));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return url;
}

// Všetky <img src="…"> v texte článku → naša adresa
export function rewriteImages(html: string) {
  return html.replace(/(<img\b[^>]*?\ssrc=)(["'])([^"']+)\2/gi, (_m, pre, q, src) => `${pre}${q}${proxiedImage(src) || src}${q}`);
}

// Štatistika návštev: lib/visitorAnalytics.ts (trackShareVisit)
