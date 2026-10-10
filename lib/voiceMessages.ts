import crypto from 'crypto';
import { purposeSecret, verifyKeys } from './secrets';
import { after } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from './prisma';
import './cloudinary'; // nastaví cloudinary.config (cloud_name, kľúče)

// ---------------------------------------------------------------------------
// Hlasovky — jedno miesto pre celé pravidlá (appka aj web):
//  • nahrať sa dá LEN v appke (mobilná routa s tokenom), web iba prehráva
//  • max. 1 minúta — kontroluje sa aj na serveri podľa dĺžky z Cloudinary
//  • zmazanie: 5 min po prvom vypočutí PRÍJEMCOM, najneskôr 5 h po odoslaní
//  • súbor je v Cloudinary ako "authenticated" — verejný odkaz neexistuje,
//    zvuk ide len cez náš server a len do času audioExpiresAt
// Striktnosť stojí na troch vrstvách: (1) po audioExpiresAt server zvuk
// nevydá nikomu, (2) mazanie z Cloudinary + DB (cron každých 5 min + poistka
// pri bežných dopytoch), (3) zametanie Cloudinary priečinka — čokoľvek
// staršie ako 5 h 5 min sa zmaže, aj keby k tomu v DB už nebol riadok.
// ---------------------------------------------------------------------------

export const VOICE_MAX_MS = 60_000;
export const VOICE_MIN_MS = 500;
export const VOICE_TTL_MS = 5 * 60 * 60 * 1000; // 5 h od odoslania
export const VOICE_AFTER_LISTEN_MS = 5 * 60 * 1000; // 5 min po vypočutí
export const VOICE_MAX_BYTES = 2 * 1024 * 1024; // minúta AAC ~0,5 MB
const VOICE_FOLDER = 'punisheredna/voice';
const TOKEN_MAX_MS = 10 * 60 * 1000; // odkaz na prehrávanie platí max. 10 min

const ASSET = { resource_type: 'video' as const, type: 'authenticated' as const };

export type VoiceView = {
  duration: number; // ms
  waveform: number[]; // 0–100
  expiresAt: string | null;
  listenedAt: string | null;
  available: boolean;
};

type VoiceRow = {
  voice: boolean;
  audioPublicId: string | null;
  audioDuration: number | null;
  audioWaveform: string | null;
  audioListenedAt: Date | null;
  audioExpiresAt: Date | null;
};

// Polia, ktoré treba vybrať z DB, aby sa dala zostaviť VoiceView.
export const VOICE_SELECT = {
  voice: true,
  audioPublicId: true,
  audioDuration: true,
  audioWaveform: true,
  audioListenedAt: true,
  audioExpiresAt: true
} as const;

export function isVoiceAvailable(m: Pick<VoiceRow, 'audioPublicId' | 'audioExpiresAt'>, now = Date.now()) {
  return !!m.audioPublicId && !!m.audioExpiresAt && m.audioExpiresAt.getTime() > now;
}

// Čo sa o hlasovke pošle klientovi — nikdy nie Cloudinary ID ani adresa.
export function voiceView(m: VoiceRow, now = Date.now()): VoiceView | null {
  if (!m.voice) return null;
  const available = isVoiceAvailable(m, now);
  return {
    duration: available ? m.audioDuration || 0 : 0,
    waveform: available ? parseWaveform(m.audioWaveform) : [],
    expiresAt: m.audioExpiresAt ? m.audioExpiresAt.toISOString() : null,
    listenedAt: m.audioListenedAt ? m.audioListenedAt.toISOString() : null,
    available
  };
}

export function voicePreview(durationMs?: number | null) {
  return durationMs ? `🎤 Hlasová zpráva (${formatDuration(durationMs)})` : '🎤 Hlasová zpráva';
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function parseWaveform(raw: string | null | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((x) => Math.max(0, Math.min(100, Math.round(Number(x)))))
    .filter((x) => Number.isFinite(x))
    .slice(0, 64);
}

// Klient posiela pole čísel (JSON) — prijmeme max. 64 hodnôt 0–100.
export function sanitizeWaveform(input: unknown): string | null {
  let arr: unknown = input;
  if (typeof input === 'string') {
    try {
      arr = JSON.parse(input);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr)) return null;
  const clean = arr
    .slice(0, 64)
    .map((x) => Math.max(0, Math.min(100, Math.round(Number(x)))))
    .filter((x) => Number.isFinite(x));
  return clean.length ? clean.join(',') : null;
}

// --- Cloudinary --------------------------------------------------------------

export async function uploadVoice(buffer: Buffer, mime: string) {
  const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
  const result: any = await cloudinary.uploader.upload(dataUri, {
    ...ASSET,
    folder: VOICE_FOLDER,
    unique_filename: true,
    overwrite: false
  });
  return {
    publicId: String(result.public_id),
    format: result.format ? String(result.format) : null,
    durationMs: typeof result.duration === 'number' ? Math.round(result.duration * 1000) : null
  };
}

export async function destroyVoice(publicId: string): Promise<boolean> {
  try {
    const r: any = await cloudinary.uploader.destroy(publicId, { ...ASSET, invalidate: true });
    return r?.result === 'ok' || r?.result === 'not found';
  } catch (e) {
    console.error('[voice] destroy zlyhal', publicId, e);
    return false;
  }
}

// Podpísaná adresa do Cloudinary — použije ju LEN náš server pri preposielaní
// zvuku, klient ju nikdy nedostane.
export function cloudinaryVoiceSource(publicId: string, format: string | null) {
  return cloudinary.url(publicId, { ...ASSET, sign_url: true, secure: true, ...(format ? { format } : {}) });
}

// --- Krátkodobý podpis odkazu na prehrávanie ---------------------------------

function signToken(messageId: string, expSec: number, key: string = purposeSecret('voice')) {
  return crypto.createHmac('sha256', key).update(`voice:${messageId}:${expSec}`).digest('base64url');
}

export function createVoiceToken(messageId: string, expiresAtMs: number) {
  const expSec = Math.floor(expiresAtMs / 1000);
  return `${expSec}.${signToken(messageId, expSec)}`;
}

export function verifyVoiceToken(messageId: string, token: string | null) {
  if (!token || typeof token !== 'string' || token.length > 200) return false;
  const [expRaw, sig] = token.split('.');
  const expSec = Number(expRaw);
  if (!Number.isFinite(expSec) || !sig) return false;
  if (expSec * 1000 <= Date.now()) return false;
  const given = Buffer.from(sig);
  for (const k of verifyKeys('voice')) {
    const expected = Buffer.from(signToken(messageId, expSec, k));
    if (expected.length === given.length && crypto.timingSafeEqual(expected, given)) return true;
  }
  return false;
}

// --- Prehratie (appka aj web) -----------------------------------------------

export type StartPlaybackResult =
  | { status: 200; url: string; expiresAt: string; listenedAt: string | null }
  | { status: 404 | 410; error: string };

// Vráti odkaz na zvuk. Ak hlasovku púšťa PRÍJEMCA prvýkrát, spustí sa
// 5-minútový odpočet (nikdy nepredĺži pôvodný 5-hodinový limit).
export async function startVoicePlayback(messageId: string, userId: string): Promise<StartPlaybackResult> {
  if (typeof messageId !== 'string' || !messageId || messageId.length > 64) {
    return { status: 404, error: 'Hlasová zpráva se nenašla.' };
  }
  const m = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, receiverId: true, ...VOICE_SELECT }
  });
  if (!m || !m.voice || (m.senderId !== userId && m.receiverId !== userId)) {
    return { status: 404, error: 'Hlasová zpráva se nenašla.' };
  }

  const now = new Date();
  if (!isVoiceAvailable(m, now.getTime())) {
    scheduleVoiceCleanup(true);
    return { status: 410, error: 'Hlasová zpráva vypršela.' };
  }

  let expiresAt = m.audioExpiresAt as Date;
  let listenedAt = m.audioListenedAt;

  if (m.receiverId === userId && !m.audioListenedAt) {
    const cap = new Date(now.getTime() + VOICE_AFTER_LISTEN_MS);
    const newExpiry = cap < expiresAt ? cap : expiresAt;
    // updateMany s podmienkou = odpočet sa spustí len raz, aj pri dvoch kliknutiach naraz
    const r = await prisma.message.updateMany({
      where: { id: m.id, audioListenedAt: null },
      data: { audioListenedAt: now, audioExpiresAt: newExpiry }
    });
    if (r.count > 0) {
      expiresAt = newExpiry;
      listenedAt = now;
    } else {
      const fresh = await prisma.message.findUnique({ where: { id: m.id }, select: { audioListenedAt: true, audioExpiresAt: true } });
      if (fresh?.audioExpiresAt) expiresAt = fresh.audioExpiresAt;
      listenedAt = fresh?.audioListenedAt || now;
    }
  }

  const tokenExp = Math.min(expiresAt.getTime(), now.getTime() + TOKEN_MAX_MS);
  return {
    status: 200,
    url: `/api/mobile/voice/${m.id}/audio?t=${createVoiceToken(m.id, tokenExp)}`,
    expiresAt: expiresAt.toISOString(),
    listenedAt: listenedAt ? listenedAt.toISOString() : null
  };
}

// --- Mazanie -----------------------------------------------------------------

const EMPTY_AUDIO = { audioPublicId: null, audioFormat: null, audioDuration: null, audioWaveform: null };

// Zmaže z Cloudinary aj z DB všetky hlasovky po ich čase. Riadok správy
// ostáva (voice=true), aby chat ukázal „Hlasová zpráva vypršela“.
export async function cleanupExpiredVoices(options: { sweepCloudinary?: boolean } = {}) {
  const rows = await prisma.message.findMany({
    where: { audioPublicId: { not: null }, audioExpiresAt: { lte: new Date() } },
    select: { id: true, audioPublicId: true },
    take: 100
  });

  let deleted = 0;
  for (const row of rows) {
    if (!row.audioPublicId) continue;
    if (await destroyVoice(row.audioPublicId)) {
      await prisma.message.update({ where: { id: row.id }, data: EMPTY_AUDIO });
      deleted++;
    }
  }

  let swept = 0;
  if (options.sweepCloudinary) swept = await sweepCloudinaryVoices();
  return { deleted, swept };
}

// Poistka: prejde priečinok hlasoviek priamo v Cloudinary a zmaže všetko
// staršie ako 5 h 5 min — aj súbory bez riadku v DB (napr. zmazaný účet).
async function sweepCloudinaryVoices() {
  try {
    const res: any = await cloudinary.api.resources({ ...ASSET, prefix: `${VOICE_FOLDER}/`, max_results: 100 });
    const cutoff = Date.now() - VOICE_TTL_MS - 5 * 60 * 1000;
    const old: string[] = (res?.resources || [])
      .filter((r: any) => new Date(r.created_at).getTime() < cutoff)
      .map((r: any) => String(r.public_id));
    if (old.length === 0) return 0;
    await cloudinary.api.delete_resources(old, { ...ASSET, invalidate: true });
    await prisma.message.updateMany({ where: { audioPublicId: { in: old } }, data: EMPTY_AUDIO });
    return old.length;
  } catch (e) {
    console.error('[voice] sweep zlyhal', e);
    return 0;
  }
}

// Poistka pri bežných dopytoch (otvorenie chatu, prehratie). Beží až PO
// odoslaní odpovede (after), najviac raz za 2 min na inštanciu — nespomalí
// chat a nepridá záťaž do Neonu.
let lastOpportunistic = 0;
export function scheduleVoiceCleanup(force = false) {
  const now = Date.now();
  if (!force && now - lastOpportunistic < 2 * 60 * 1000) return;
  lastOpportunistic = now;
  try {
    after(() => cleanupExpiredVoices().catch((e) => console.error('[voice] cleanup', e)));
  } catch {
    /* mimo požiadavky — nevadí, postará sa cron */
  }
}

// Pomôcka pre zoznamy správ: ak je v nich niečo po čase, naplánuj upratanie.
export function cleanupIfAnyExpired(rows: Array<Pick<VoiceRow, 'audioPublicId' | 'audioExpiresAt'>>) {
  const now = Date.now();
  if (rows.some((r) => r.audioPublicId && r.audioExpiresAt && r.audioExpiresAt.getTime() <= now)) scheduleVoiceCleanup(true);
}
