import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startVoicePlayback } from '@/lib/voiceMessages';

export const dynamic = 'force-dynamic';

// Web: hlasovku môže iba PREHRAŤ (nahrávať sa dá len v appke).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });
  const result = await startVoicePlayback(id, (session.user as any).id);
  if (result.status !== 200) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
