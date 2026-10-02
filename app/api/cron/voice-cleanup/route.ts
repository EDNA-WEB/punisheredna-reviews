import { NextResponse } from 'next/server';
import { cleanupExpiredVoices } from '@/lib/voiceMessages';
import { cleanupExpiredPhotos } from '@/lib/photoMessages';
import { analyticsMaintenance } from '@/lib/visitorAnalytics';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Maže hlasovky (5 min po vypočutí / 5 h), fotky (24 h) a robí údržbu analytiky
// (denné súhrny, mazanie podrobností po 30 dňoch, mazanie starých solí).
// Volá ho GitHub Actions každých 5 minút (.github/workflows/hlasovky-mazanie.yml).
// Chránené tajným kľúčom CRON_SECRET (rovnaká hodnota vo Verceli aj v GitHub Secrets).
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const [voices, photos, analytics] = await Promise.all([
    cleanupExpiredVoices({ sweepCloudinary: true }),
    cleanupExpiredPhotos({ sweepCloudinary: true }),
    analyticsMaintenance().catch((e) => ({ error: String(e?.message || e) }))
  ]);
  return NextResponse.json(
    { ok: true, deleted: voices.deleted, swept: voices.swept, photosDeleted: photos.deleted, photosSwept: photos.swept, analytics },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export const GET = run;
export const POST = run;
