import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { startVoicePlayback } from '@/lib/voiceMessages';

export const dynamic = 'force-dynamic';

// Appka: chcem pustiť hlasovku → krátkodobý odkaz na zvuk. Ak ju púšťa
// príjemca prvýkrát, spustí sa 5-minútový odpočet do zmazania.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });
  const result = await startVoicePlayback(id, user.id);
  if (result.status !== 200) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
