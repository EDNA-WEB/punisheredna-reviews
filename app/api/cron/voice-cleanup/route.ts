import { NextResponse } from 'next/server';
import { cleanupExpiredVoices } from '@/lib/voiceMessages';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Volá ho GitHub Actions každých 5 minút (.github/workflows/hlasovky-mazanie.yml).
// Chránené tajným kľúčom CRON_SECRET (rovnaká hodnota vo Verceli aj v GitHub Secrets).
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const result = await cleanupExpiredVoices({ sweepCloudinary: true });
  return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
}

export const GET = run;
export const POST = run;
