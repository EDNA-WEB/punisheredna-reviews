import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { toggleReaction } from '@/lib/messageActions';

export const dynamic = 'force-dynamic';

// Web: klik na reakciu pod správou ju pridá / odoberie.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });
  const json = await req.json().catch(() => ({}));
  const r = await toggleReaction(id, (session.user as any).id, json?.emoji);
  return NextResponse.json(r.status === 200 ? r.data : { error: r.error }, { status: r.status });
}
