import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Samostatné tajné kľúče pre jednotlivé účely (predtým sa na všetko používal
// jeden NEXTAUTH_SECRET — jeho únik by prelomil všetko naraz).
//
// Každý účel má vlastnú premennú vo Verceli. Ak nie je nastavená, kľúč sa
// odvodí z NEXTAUTH_SECRET (HMAC s názvom účelu) — aj tak sa už podpisy
// rôznych účelov navzájom nedajú zameniť. Najvyššiu ochranu dajú až vlastné
// náhodné hodnoty v premenných nižšie.
//
// Prechodné obdobie: podpisy vytvorené PRED touto zmenou (pôvodným
// NEXTAUTH_SECRET) platia ešte do dátumu v LEGACY_UNTIL, nech sa nikto
// neodhlási z appky a staré odkazy v e-mailoch / zdieľané články fungujú.
// ---------------------------------------------------------------------------

export type SecretPurpose = 'mobile' | 'share' | 'unsubscribe' | 'voice' | 'twofactor';

const ENV_NAME: Record<SecretPurpose, string> = {
  mobile: 'MOBILE_JWT_SECRET',
  share: 'SHARE_SECRET',
  unsubscribe: 'UNSUBSCRIBE_SECRET',
  voice: 'VOICE_SECRET',
  twofactor: 'TWOFACTOR_SECRET'
};

// null = pôvodný kľúč platí bez obmedzenia (nízke riziko: zdieľané odkazy
// môžu byť dlho vyvesené na fórach, odkazy na odhlásenie sú v starých e-mailoch).
const LEGACY_UNTIL: Record<SecretPurpose, string | null> = {
  mobile: '2026-12-01', // tokeny appky platia 30 dní
  share: null,
  unsubscribe: null,
  voice: '2026-11-01', // odkazy na hlasovky platia len pár minút
  twofactor: '2000-01-01' // nový účel — žiadny pôvodný kľúč
};

function master(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error('NEXTAUTH_SECRET nie je nastavený.');
  return s;
}

function derived(purpose: SecretPurpose): string {
  return crypto.createHmac('sha256', master()).update(`kralfilmu-key:${purpose}`).digest('base64url');
}

// Kľúč, ktorým sa PODPISUJE.
export function purposeSecret(purpose: SecretPurpose): string {
  const own = process.env[ENV_NAME[purpose]];
  if (own && own.length >= 32) return own;
  return derived(purpose);
}

// Kľúče, ktorými sa OVERUJE: aktuálny, odvodený (ak sa neskôr nastaví vlastná
// premenná, podpisy z medzičasu ďalej platia) a pôvodný počas prechodného obdobia.
export function verifyKeys(purpose: SecretPurpose): string[] {
  const keys = [purposeSecret(purpose), derived(purpose)];
  const until = LEGACY_UNTIL[purpose];
  if (!until || Date.now() <= Date.parse(until + 'T23:59:59Z')) {
    // Pri hlasovkách sa predtým používal VOICE_SECRET, ak bol nastavený.
    const legacy = purpose === 'voice' ? process.env.VOICE_SECRET || process.env.NEXTAUTH_SECRET : process.env.NEXTAUTH_SECRET;
    if (legacy) keys.push(legacy);
  }
  return Array.from(new Set(keys));
}
