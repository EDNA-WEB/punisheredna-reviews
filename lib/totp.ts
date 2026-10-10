import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Jednorazové kódy z aplikácie v mobile (TOTP, RFC 6238) — rovnaký štandard,
// aký používa Google Authenticator, Microsoft Authenticator, 1Password…
// 6 číslic, nový kód každých 30 sekúnd, HMAC-SHA1. Bez externej knižnice.
// ---------------------------------------------------------------------------

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const TOTP_PERIOD = 30;
const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// Nové náhodné tajomstvo (160 bitov) v tvare base32.
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function totpAt(secretBase32: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', base32Decode(secretBase32)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function currentStep(now = Date.now()): number {
  return Math.floor(now / 1000 / TOTP_PERIOD);
}

// Overí kód s toleranciou ±1 krok (rozdiel hodín telefónu a servera).
// Vráti číslo kroku, ktorému kód patrí (kvôli ochrane pred opätovným
// použitím toho istého kódu), alebo null.
export function matchTotp(secretBase32: string, code: string, now = Date.now()): number | null {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return null;
  const step = currentStep(now);
  const given = Buffer.from(c);
  for (const s of [step - 1, step, step + 1]) {
    const expected = Buffer.from(totpAt(secretBase32, s));
    if (crypto.timingSafeEqual(expected, given)) return s;
  }
  return null;
}

export function otpauthUrl(secretBase32: string, accountName: string, issuer = 'KralFilmu.cz'): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const qs = new URLSearchParams({ secret: secretBase32, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(TOTP_PERIOD) });
  return `otpauth://totp/${label}?${qs.toString()}`;
}

// Tajomstvo po štyroch znakoch — na ručné prepísanie do aplikácie.
export function formatSecret(secretBase32: string): string {
  return secretBase32.replace(/(.{4})/g, '$1 ').trim();
}
