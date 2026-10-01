import { NextResponse } from 'next/server';
import { cleanupExpiredVoices } from '@/lib/voiceMessages';
import { cleanupExpiredPhotos } from '@/lib/photoMessages';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Maže hlasovky (5 min po vypočutí / 5 h) aj fotky (24 h).
// Volá ho GitHub Actions každých 5 minút (.github/workflows/hlasovky-mazanie.yml).
// Chránené tajným kľúčom CRON_SECRET (rovnaká hodnota vo Verceli aj v GitHub Secrets).
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const [voices, photos] = await Promise.all([
    cleanupExpiredVoices({ sweepCloudinary: true }),
    cleanupExpiredPhotos({ sweepCloudinary: true })
  ]);
  return NextResponse.json(
    { ok: true, deleted: voices.deleted, swept: voices.swept, photosDeleted: photos.deleted, photosSwept: photos.swept },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export const GET = run;
export const POST = run;
