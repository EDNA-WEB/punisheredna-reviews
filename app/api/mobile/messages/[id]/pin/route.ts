import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { setPinned } from '@/lib/messageActions';

export const dynamic = 'force-dynamic';

// POST { pinned: true|false } — pripnúť / odopnúť správu v konverzácii
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });
  const json = await req.json().catch(() => ({}));
  const r = await setPinned(id, user.id, json?.pinned);
  return NextResponse.json(r.status === 200 ? r.data : { error: r.error }, { status: r.status });
}
