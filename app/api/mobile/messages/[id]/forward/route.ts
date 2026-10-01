import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { forwardMessage } from '@/lib/messageActions';

export const dynamic = 'force-dynamic';

// POST { receiverId } — prepošle text alebo fotku inému používateľovi
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });
  const json = await req.json().catch(() => ({}));
  const r = await forwardMessage(id, user.id, json?.receiverId);
  return NextResponse.json(r.status < 300 ? r.data : { error: r.error }, { status: r.status });
}
