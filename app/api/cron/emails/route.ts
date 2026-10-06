import { NextResponse } from 'next/server';
import { processOnlineNotifications, processMessageNotifications } from '@/lib/email/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// E-mailové oznámenia „film je online“ a „nová správa“. Spúšťa GitHub
// Actions (.github/workflows/emaily.yml) každých 10 minút.
// Chránené hlavičkou Authorization: Bearer <CRON_SECRET>.
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result: Record<string, unknown> = {};
  try {
    result.online = await processOnlineNotifications();
  } catch (error: any) {
    console.error('[cron/emails online]', error);
    result.online = { error: String(error?.message || error) };
  }
  try {
    result.messages = await processMessageNotifications();
  } catch (error: any) {
    console.error('[cron/emails messages]', error);
    result.messages = { error: String(error?.message || error) };
  }
  return NextResponse.json({ ok: true, ...result });
}

export const GET = run;
export const POST = run;
