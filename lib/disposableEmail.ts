import { promises as dns } from 'dns';
import { prisma } from './prisma';
import { BUILTIN_DISPOSABLE, SAFE_PROVIDERS } from './disposableDomains';

// ---------------------------------------------------------------------------
// Ochrana proti dočasným e-mailom (10minutemail, temp-mail, mailinator…).
// Kontroluje sa v troch vrstvách:
//  1. doména (aj jej nadradené domény) v zozname dočasných služieb —
//     verejné komunitné zoznamy (desaťtisíce domén, obnova každých 12 h),
//     vstavaná záloha a vlastný zoznam z administrácie,
//  2. poštový server domény (MX) — služby s náhodnými novými doménami
//     posielajú poštu na svoje známe servery, ktoré sú v zozname,
//  3. doména musí naozaj prijímať poštu (inak ide o preklep alebo výmysel).
// ---------------------------------------------------------------------------

const SOURCES = [
  'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf',
  'https://disposable.github.io/disposable-email-domains/domains.txt'
];
const ALLOW_SOURCE = 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/allowlist.conf';
const REFRESH_MS = 12 * 60 * 60 * 1000;

// Kľúčové slová v názve poštového servera, ktoré používajú dočasné služby.
const MX_KEYWORDS = ['mailinator', 'guerrilla', 'yopmail', 'temp-mail', 'tempmail', 'trashmail', 'dropmail', 'mail.tm', 'mail.gw', '10minute', 'throwaway', 'disposable', 'maildrop', 'getnada', 'mailnesia', 'spamgourmet', 'emailondeck', '1secmail'];

type Lists = { block: Set<string>; allow: Set<string>; loadedAt: number; remoteCount: number };
const g = globalThis as unknown as { __disposableLists?: Lists; __disposableLoading?: Promise<Lists> };

function parse(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, '').trim().toLowerCase())
    .filter((l) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(l));
}

async function fetchText(url: string) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    return res.ok ? await res.text() : '';
  } catch {
    return '';
  }
}

async function loadLists(): Promise<Lists> {
  const now = Date.now();
  if (g.__disposableLists && now - g.__disposableLists.loadedAt < REFRESH_MS) return g.__disposableLists;
  if (g.__disposableLoading) return g.__disposableLoading;
  g.__disposableLoading = (async () => {
    const [remoteTexts, allowText, custom] = await Promise.all([
      Promise.all(SOURCES.map(fetchText)),
      fetchText(ALLOW_SOURCE),
      prisma.emailDomainRule.findMany({ select: { domain: true, allow: true } }).catch(() => [] as { domain: string; allow: boolean }[])
    ]);
    const remote = remoteTexts.flatMap(parse);
    const block = new Set<string>([...BUILTIN_DISPOSABLE, ...remote]);
    const allow = new Set<string>([...SAFE_PROVIDERS, ...parse(allowText)]);
    for (const r of custom) (r.allow ? allow : block).add(r.domain.toLowerCase());
    // Pri výpadku zdrojov ponechať predošlý (väčší) zoznam.
    const prev = g.__disposableLists;
    const lists: Lists =
      remote.length === 0 && prev && prev.remoteCount > 0
        ? { ...prev, loadedAt: now - REFRESH_MS + 30 * 60 * 1000 }
        : { block, allow, loadedAt: now, remoteCount: remote.length };
    g.__disposableLists = lists;
    return lists;
  })().finally(() => {
    g.__disposableLoading = undefined;
  });
  return g.__disposableLoading;
}

// Po zmene vlastného zoznamu v administrácii načítať znova.
export function resetDisposableCache() {
  g.__disposableLists = undefined;
}

// "a.b.mailinator.com" → ["a.b.mailinator.com", "b.mailinator.com", "mailinator.com"]
function parents(domain: string) {
  const parts = domain.split('.');
  const out: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join('.'));
  return out;
}

function listed(domain: string, lists: Lists): 'block' | 'allow' | null {
  for (const d of parents(domain)) {
    if (lists.allow.has(d)) return 'allow';
    if (lists.block.has(d)) return 'block';
  }
  return null;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([p, new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), ms))]);
}

export type EmailCheck = { ok: true } | { ok: false; reason: 'disposable' | 'no-mail'; message: string };

const MSG_DISPOSABLE = 'Dočasné e-mailové adresy nepodporujeme. Použij prosím svůj běžný e-mail.';
const MSG_NO_MAIL = 'Na tuto e-mailovou adresu nelze doručit poštu. Zkontroluj prosím, jestli je napsaná správně.';

export async function checkEmailAllowed(email: string): Promise<EmailCheck> {
  const domain = String(email || '').split('@')[1]?.toLowerCase().trim().replace(/\.$/, '');
  if (!domain) return { ok: false, reason: 'no-mail', message: MSG_NO_MAIL };

  const lists = await loadLists();
  const verdict = listed(domain, lists);
  if (verdict === 'allow') return { ok: true };
  if (verdict === 'block') return { ok: false, reason: 'disposable', message: MSG_DISPOSABLE };

  // Poštové servery domény
  const mx = await withTimeout(dns.resolveMx(domain).catch((e: any) => (e?.code === 'ENOTFOUND' || e?.code === 'ENODATA' ? [] : null)), 3500);
  if (mx === 'timeout' || mx === null) return { ok: true }; // DNS nedostupné → nebrániť registrácii

  if (mx.length === 0) {
    // Bez MX môže poštu prijímať priamo adresa domény (A záznam).
    const a = await withTimeout(dns.resolve4(domain).catch(() => [] as string[]), 2500);
    if (a !== 'timeout' && Array.isArray(a) && a.length === 0) return { ok: false, reason: 'no-mail', message: MSG_NO_MAIL };
    return { ok: true };
  }
  // „Null MX“ (RFC 7505) = doména poštu výslovne neprijíma.
  if (mx.every((r) => !r.exchange || r.exchange === '.')) return { ok: false, reason: 'no-mail', message: MSG_NO_MAIL };

  for (const r of mx) {
    const host = r.exchange.toLowerCase().replace(/\.$/, '');
    if (MX_KEYWORDS.some((k) => host.includes(k))) return { ok: false, reason: 'disposable', message: MSG_DISPOSABLE };
    const v = listed(host, lists);
    if (v === 'block') return { ok: false, reason: 'disposable', message: MSG_DISPOSABLE };
  }
  return { ok: true };
}

// Pre administráciu: počty a výsledok testu.
export async function disposableStats() {
  const lists = await loadLists();
  return { blocked: lists.block.size, remote: lists.remoteCount, loadedAt: new Date(lists.loadedAt).toISOString() };
}
