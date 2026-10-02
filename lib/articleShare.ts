import crypto from 'crypto';
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

function secret() {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error('Chýba NEXTAUTH_SECRET');
  return s;
}

function hmac(data: string) {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url');
}

// Kľúč pre jeden článok (novinka podľa slugu, blog podľa id)
export function shareKey(type: ShareType, ref: string, salt: string) {
  return hmac(`share:${salt}:${type}:${ref}`).slice(0, 22);
}

export async function verifyShareKey(type: ShareType, ref: string, key: string | undefined | null) {
  if (!key || typeof key !== 'string' || key.length !== 22) return false;
  const { salt } = await getShareConfig();
  const a = Buffer.from(shareKey(type, ref, salt));
  const b = Buffer.from(key);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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

// --- Štatistika ------------------------------------------------------------------

const BOT_RE = /(bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|whatsapp|telegram|discord|slack|skype|linkedin|twitter|embedly|preview|pinterest|vkshare|headless|lighthouse|curl|wget|python|axios|node-fetch)/i;

export async function recordShareView(type: ShareType, articleId: string) {
  try {
    const h = await headers();
    const ua = h.get('user-agent') || '';
    if (!ua || BOT_RE.test(ua)) return; // náhľady odkazov (Messenger, WhatsApp…) a roboti sa nerátajú
    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || '';
    const visitorHash = hmac(`visitor:${ip}:${ua}`).slice(0, 24);

    let source: string | null = null;
    const ref = h.get('referer');
    if (ref) {
      try {
        const host = new URL(ref).hostname.replace(/^www\./, '');
        const own = (h.get('host') || '').replace(/^www\./, '');
        if (host && host !== own) source = host.slice(0, 80);
      } catch {
        /* neplatný referer */
      }
    }

    // Obnovenie stránky do 10 min sa neráta ako ďalšie kliknutie
    const recent = await prisma.articleShareView.findFirst({
      where: { articleType: type, articleId, visitorHash, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
      select: { id: true }
    });
    if (recent) return;
    await prisma.articleShareView.create({ data: { articleType: type, articleId, visitorHash, source } });
  } catch (e) {
    console.error('[articleShare] štatistika', e);
  }
}
