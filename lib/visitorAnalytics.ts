import crypto from 'crypto';
import { promises as dns } from 'dns';
import { after } from 'next/server';
import { headers, cookies } from 'next/headers';
import { prisma } from './prisma';
import { memo } from './memoCache';
import { isBot, parseUserAgent } from './userAgent';

// ---------------------------------------------------------------------------
// ANALYTIKA ZDIEĽANÝCH ČLÁNKOV — privacy by design
//
//  • žiadne cookies ani ukladanie do zariadenia návštevníka
//  • plná IP adresa sa NIKDY neukladá: hneď sa skráti (IPv4 /24, IPv6 /48)
//  • návšteva = HMAC(denná soľ, skrátená IP + prehliadač + OS + deň); soľ sa
//    každý deň mení a stará sa maže → návštevy sa nedajú spojiť naprieč dňami
//    ani spätne priradiť k IP
//  • krajina / kraj / mesto z hlavičiek Vercelu, poskytovateľ siete (ASN)
//    cez DNS službu Team Cymru — odchádza len skrátená IP (sieť), nie adresa
//  • podrobnosti sa mažú po 30 dňoch, ostávajú len anonymné denné súhrny
//  • administrátori sú vylúčení (prihlásení, ANALYTICS_EXCLUDE_IPS, cookie)
// ---------------------------------------------------------------------------

export const RETENTION_DAYS = 30;

// --- IP ---------------------------------------------------------------------

export function truncateIp(ip: string) {
  if (ip.includes(':')) {
    const parts = expandIPv6(ip);
    return parts ? `${parts.slice(0, 3).join(':')}::` : null;
  }
  const p = ip.split('.');
  return p.length === 4 ? `${p[0]}.${p[1]}.${p[2]}.0` : null;
}

function expandIPv6(ip: string): string[] | null {
  const clean = ip.split('%')[0];
  const [head, tail] = clean.split('::');
  const h = head ? head.split(':') : [];
  const t = tail !== undefined ? (tail ? tail.split(':') : []) : [];
  const fill = tail !== undefined ? 8 - h.length - t.length : 0;
  const all = [...h, ...Array(Math.max(0, fill)).fill('0'), ...t].map((x) => x.padStart(4, '0').toLowerCase());
  return all.length === 8 ? all : null;
}

function ipv4ToInt(ip: string) {
  return ip.split('.').reduce((a, o) => (a << 8) + (Number(o) & 255), 0) >>> 0;
}

// ANALYTICS_EXCLUDE_IPS="185.12.34.56, 185.12.34.0/24, 2a02:1234:abcd::/48"
function isExcludedIp(ip: string) {
  const list = (process.env.ANALYTICS_EXCLUDE_IPS || '').split(',').map((x) => x.trim()).filter(Boolean);
  for (const rule of list) {
    const [base, bitsRaw] = rule.split('/');
    if (ip.includes(':') !== base.includes(':')) continue;
    if (!bitsRaw) {
      if (ip === base) return true;
      continue;
    }
    const bits = Number(bitsRaw);
    if (!ip.includes(':')) {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      if ((ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask)) return true;
    } else {
      const a = expandIPv6(ip)?.join('') || '';
      const b = expandIPv6(base)?.join('') || '';
      const nibbles = Math.floor(bits / 4);
      if (a && b && a.slice(0, nibbles) === b.slice(0, nibbles)) return true;
    }
  }
  return false;
}

// --- Denná soľ ----------------------------------------------------------------

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function getSalt(day: string) {
  return memo(`analytics:salt:${day}`, 60 * 60 * 1000, async () => {
    const existing = await prisma.analyticsSalt.findUnique({ where: { day } });
    if (existing) return existing.salt;
    const salt = crypto.randomBytes(32).toString('base64');
    try {
      await prisma.analyticsSalt.create({ data: { day, salt } });
      return salt;
    } catch {
      // súbežne vytvorila iná inštancia — použijeme jej
      return (await prisma.analyticsSalt.findUnique({ where: { day } }))!.salt;
    }
  });
}

// --- Poskytovateľ siete (ASN) cez DNS Team Cymru ----------------------------------

async function lookupAsn(networkIp: string): Promise<{ asn: number; org: string } | null> {
  return memo(`analytics:asn:${networkIp}`, 24 * 60 * 60 * 1000, async () => {
    try {
      let q: string;
      if (networkIp.includes(':')) {
        const nib = (expandIPv6(networkIp) || []).slice(0, 3).join('').split('');
        q = `${nib.reverse().join('.')}.origin6.asn.cymru.com`;
      } else {
        const [a, b, c] = networkIp.split('.');
        q = `${c}.${b}.${a}.origin.asn.cymru.com`;
      }
      const txt = (await withTimeout(dns.resolveTxt(q), 1500)).flat().join(' ');
      const asn = Number(txt.split('|')[0].trim().split(' ')[0]);
      if (!asn) return null;
      const info = (await withTimeout(dns.resolveTxt(`AS${asn}.asn.cymru.com`), 1500)).flat().join(' ');
      const org = (info.split('|').pop() || '').trim().replace(/,\s*[A-Z]{2}$/, '').replace(/^[A-Z0-9-]+\s+/, '') || `AS${asn}`;
      return { asn, org: org.slice(0, 120) };
    } catch {
      return null;
    }
  });
}

function withTimeout<T>(p: Promise<T>, ms: number) {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

// --- Zápis návštevy -------------------------------------------------------------

export function normalizeTag(raw: unknown) {
  if (typeof raw !== 'string') return null;
  const t = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return t || null;
}

// Volá stránka zdieľaného článku. Údaje z hlavičiek prečíta hneď, samotný
// zápis (DNS, databáza) prebehne až PO odoslaní stránky — návštevník nečaká.
export async function trackShareVisit(articleType: 'news' | 'blog', articleId: string, sourceTag: string | null) {
  try {
    const h = await headers();
    const c = await cookies();
    if (c.get('kf_no_track')?.value === '1') return; // „Nezapočítávat toto zařízení“

    const ua = h.get('user-agent') || '';
    if (isBot(ua)) return;
    const rawIp = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || '';
    if (!rawIp || isExcludedIp(rawIp)) return;

    const network = truncateIp(rawIp); // od tohto miesta sa plná IP už nepoužíva
    if (!network) return;

    const parsed = parseUserAgent(ua, { platform: h.get('sec-ch-ua-platform'), mobile: h.get('sec-ch-ua-mobile') });
    const country = (h.get('x-vercel-ip-country') || '').slice(0, 2) || null;
    const region = (h.get('x-vercel-ip-country-region') || '').slice(0, 10) || null;
    let city: string | null = null;
    try {
      city = h.get('x-vercel-ip-city') ? decodeURIComponent(h.get('x-vercel-ip-city') as string).slice(0, 80) : null;
    } catch {
      city = null;
    }

    let referrerHost: string | null = null;
    const ref = h.get('referer');
    if (ref) {
      try {
        const host = new URL(ref).hostname.replace(/^www\./, '');
        const own = (h.get('host') || '').replace(/^www\./, '');
        if (host && host !== own) referrerHost = host.slice(0, 80);
      } catch {
        /* neplatný referer */
      }
    }

    const day = today();
    const work = async () => {
      const salt = await getSalt(day);
      const sessionId = crypto
        .createHmac('sha256', salt)
        .update(`${network}|${parsed.browser || ''}|${parsed.os || ''}|${day}`)
        .digest('base64url')
        .slice(0, 32);

      const existing = await prisma.visitorSession.findUnique({ where: { id: sessionId }, select: { id: true } });
      if (existing) {
        // obnovenie tej istej stránky do 10 minút sa neráta
        const recent = await prisma.shareVisit.findFirst({
          where: { sessionId, articleType, articleId, visitedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
          select: { id: true }
        });
        if (recent) return;
        await prisma.visitorSession.update({ where: { id: sessionId }, data: { lastSeen: new Date(), pages: { increment: 1 } } });
      } else {
        const asn = await lookupAsn(network);
        try {
          await prisma.visitorSession.create({
            data: {
              id: sessionId,
              sourceTag,
              referrerHost,
              deviceType: parsed.deviceType,
              os: parsed.os,
              browser: parsed.browser,
              country,
              region,
              city,
              asn: asn?.asn ?? null,
              asnOrg: asn?.org ?? null
            }
          });
        } catch (e: any) {
          if (e?.code !== 'P2002') throw e; // súbežné otvorenie
        }
      }
      await prisma.shareVisit.create({ data: { sessionId, articleType, articleId } });
    };

    try {
      after(() => work().catch((e) => console.error('[analytics] zápis zlyhal', e?.message)));
    } catch {
      await work();
    }
  } catch (e: any) {
    console.error('[analytics]', e?.message); // bez IP a bez hlavičiek v logu
  }
}

// --- Údržba (volá cron každých 5 min) --------------------------------------------------

export async function analyticsMaintenance() {
  // 1) Súhrny za včera a dnes (prepočet — bezpečné spúšťať opakovane)
  const aggregated = await prisma.$executeRaw`
    INSERT INTO "ShareDailyStat" ("day", "articleType", "articleId", "sourceTag", "referrerHost", "country", "deviceType", "visits", "sessions")
    SELECT to_char(v."visitedAt", 'YYYY-MM-DD'), v."articleType", v."articleId",
           COALESCE(s."sourceTag", ''), COALESCE(s."referrerHost", ''), COALESCE(s."country", ''), COALESCE(s."deviceType", ''),
           COUNT(*)::int, COUNT(DISTINCT s."id")::int
    FROM "ShareVisit" v JOIN "VisitorSession" s ON s."id" = v."sessionId"
    WHERE v."visitedAt" >= date_trunc('day', now()) - interval '1 day'
    GROUP BY 1, 2, 3, 4, 5, 6, 7
    ON CONFLICT ("day", "articleType", "articleId", "sourceTag", "referrerHost", "country", "deviceType")
    DO UPDATE SET "visits" = EXCLUDED."visits", "sessions" = EXCLUDED."sessions"
  `;

  // 2) Podrobnosti staršie ako 30 dní preč (zobrazenia sa zmažú kaskádou)
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const deleted = await prisma.visitorSession.deleteMany({ where: { lastSeen: { lt: cutoff } } });

  // 3) Staré soli preč → spätná deanonymizácia je nemožná
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const salts = await prisma.analyticsSalt.deleteMany({ where: { day: { lt: yesterday } } });

  return { aggregated, deletedSessions: deleted.count, deletedSalts: salts.count };
}
