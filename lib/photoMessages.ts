import { after } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from './prisma';
import './cloudinary'; // nastaví cloudinary.config

// ---------------------------------------------------------------------------
// Fotky v chate (appka aj web, rovnaké pravidlá):
//  • max. 5 fotiek naraz, max. 10 fotiek za deň (deň = polnoc–polnoc SK/CZ)
//  • fotka ostáva 24 h od odoslania — potom sa zmaže z Cloudinary aj z DB,
//    v chate ostane „Fotka vypršela“ (photo=true, image=null)
//  • počas 24 h sa dá normálne otvoriť, priblížiť, uložiť, zdieľať
//  • pri nahratí ju Cloudinary zmenší na max. 1600 px (šetrí miesto)
// Mazanie: cron každých 5 min (spolu s hlasovkami) + poistka pri otvorení
// chatu + zametanie priečinka v Cloudinary (všetko staršie ako 24 h 5 min).
// ---------------------------------------------------------------------------

export const PHOTO_TTL_MS = 24 * 60 * 60 * 1000;
export const PHOTO_MAX_BATCH = 5;
export const PHOTO_DAILY_LIMIT = 10;
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024; // limit tela požiadavky na Verceli je 4,5 MB
const PHOTO_FOLDER = 'punisheredna/chat';
const LEGACY_FOLDER = 'punisheredna/messages'; // staré jednorazové fotky
const BATCH_WINDOW_MS = 2 * 60 * 1000;

type PhotoRow = {
  photo?: boolean;
  image: string | null;
  imageExpiresAt?: Date | null;
  createdAt: Date;
};

// ("image" a "createdAt" si vyberá každý dopyt sám)
export const PHOTO_SELECT = { photo: true, imageExpiresAt: true } as const;

export function photoExpiry(m: PhotoRow) {
  return m.imageExpiresAt ? m.imageExpiresAt.getTime() : m.createdAt.getTime() + PHOTO_TTL_MS;
}

export function isPhotoAvailable(m: PhotoRow, now = Date.now()) {
  return !!m.image && photoExpiry(m) > now;
}

export function photoThumbUrl(url: string, width = 640) {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/w_${width},c_limit,q_auto,f_auto/`);
}

// Čo o fotke dostane klient.
export function photoView(m: PhotoRow, now = Date.now()) {
  const isPhoto = !!m.photo || !!m.image;
  if (!isPhoto) return { image: null, imageThumb: null, photoExpired: false, photoExpiresAt: null };
  const available = isPhotoAvailable(m, now);
  return {
    image: available ? (m.image as string) : null,
    imageThumb: available ? photoThumbUrl(m.image as string) : null,
    photoExpired: !available,
    photoExpiresAt: new Date(photoExpiry(m)).toISOString()
  };
}

// Polnoc dnešného dňa v SK/CZ čase (zohľadní letný/zimný čas).
export function startOfTodayLocal(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bratislava',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  const localAsUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second'));
  const offset = localAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(g('year'), g('month') - 1, g('day')) - offset);
}

// Kontrola limitov PRED nahraním. Vráti text chyby alebo null.
export async function checkPhotoLimits(senderId: string): Promise<{ error: string | null; leftToday: number }> {
  const now = new Date();
  const [today, recent] = await Promise.all([
    prisma.message.count({ where: { senderId, photo: true, createdAt: { gte: startOfTodayLocal(now) } } }),
    prisma.message.count({ where: { senderId, photo: true, createdAt: { gte: new Date(now.getTime() - BATCH_WINDOW_MS) } } })
  ]);
  const leftToday = Math.max(0, PHOTO_DAILY_LIMIT - today);
  if (leftToday <= 0) {
    return { error: `Dnes už jsi poslal ${PHOTO_DAILY_LIMIT} fotek. Další můžeš poslat zítra.`, leftToday: 0 };
  }
  if (recent >= PHOTO_MAX_BATCH) {
    return { error: `Najednou můžeš poslat maximálně ${PHOTO_MAX_BATCH} fotek. Zkus to za chvíli.`, leftToday };
  }
  return { error: null, leftToday };
}

// Nahrá fotku (dátová URL z webu alebo súbor z appky). Cloudinary ju rovno
// zmenší a prevedie na JPG, takže zaberá čo najmenej miesta.
export async function uploadChatPhoto(source: string | Buffer, mime = 'image/jpeg') {
  const data = typeof source === 'string' ? source : `data:${mime};base64,${source.toString('base64')}`;
  const result: any = await cloudinary.uploader.upload(data, {
    folder: PHOTO_FOLDER,
    resource_type: 'image',
    unique_filename: true,
    overwrite: false,
    format: 'jpg',
    transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto:good' }]
  });
  return { url: String(result.secure_url), publicId: String(result.public_id) };
}

function publicIdFromUrl(url: string) {
  const rest = url.split('/upload/')[1];
  if (!rest) return null;
  return rest.replace(/^v\d+\//, '').replace(/\.[a-zA-Z0-9]+$/, '');
}

export async function destroyChatPhoto(publicId: string | null, url?: string | null): Promise<boolean> {
  const id = publicId || (url && url.includes('res.cloudinary.com') ? publicIdFromUrl(url) : null);
  if (!id) return true; // nie je z Cloudinary — nie je čo mazať
  try {
    const r: any = await cloudinary.uploader.destroy(id, { resource_type: 'image', invalidate: true });
    return r?.result === 'ok' || r?.result === 'not found';
  } catch (e) {
    console.error('[photo] destroy zlyhal', id, e);
    return false;
  }
}

// Zmaže fotky po 24 h (aj staré z doby pred touto zmenou).
export async function cleanupExpiredPhotos(options: { sweepCloudinary?: boolean } = {}) {
  const now = new Date();
  const rows = await prisma.message.findMany({
    where: {
      image: { not: null },
      OR: [{ imageExpiresAt: { lte: now } }, { imageExpiresAt: null, createdAt: { lte: new Date(now.getTime() - PHOTO_TTL_MS) } }]
    },
    select: { id: true, image: true, imagePublicId: true },
    take: 100
  });

  let deleted = 0;
  for (const row of rows) {
    if (await destroyChatPhoto(row.imagePublicId, row.image)) {
      await prisma.message.update({ where: { id: row.id }, data: { image: null, imagePublicId: null, photo: true } });
      deleted++;
    }
  }

  let swept = 0;
  if (options.sweepCloudinary) swept = await sweepCloudinaryPhotos();
  return { deleted, swept };
}

async function sweepCloudinaryPhotos() {
  let total = 0;
  for (const folder of [PHOTO_FOLDER, LEGACY_FOLDER]) {
    try {
      const res: any = await cloudinary.api.resources({ type: 'upload', resource_type: 'image', prefix: `${folder}/`, max_results: 100 });
      const cutoff = Date.now() - PHOTO_TTL_MS - 5 * 60 * 1000;
      const old: string[] = (res?.resources || [])
        .filter((r: any) => new Date(r.created_at).getTime() < cutoff)
        .map((r: any) => String(r.public_id));
      if (old.length === 0) continue;
      await cloudinary.api.delete_resources(old, { type: 'upload', resource_type: 'image', invalidate: true });
      await prisma.message.updateMany({ where: { imagePublicId: { in: old } }, data: { image: null, imagePublicId: null } });
      total += old.length;
    } catch (e) {
      console.error('[photo] sweep zlyhal', folder, e);
    }
  }
  return total;
}

let lastOpportunistic = 0;
export function schedulePhotoCleanup(force = false) {
  const now = Date.now();
  if (!force && now - lastOpportunistic < 2 * 60 * 1000) return;
  lastOpportunistic = now;
  try {
    after(() => cleanupExpiredPhotos().catch((e) => console.error('[photo] cleanup', e)));
  } catch {
    /* mimo požiadavky — postará sa cron */
  }
}

export function photoCleanupIfAnyExpired(rows: PhotoRow[]) {
  const now = Date.now();
  if (rows.some((r) => r.image && photoExpiry(r) <= now)) schedulePhotoCleanup(true);
}
