import { NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { deleteMessage, editMessage } from '@/lib/messageActions';

export const dynamic = 'force-dynamic';

const unauthorized = () => NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

// PATCH { body } — úprava vlastnej správy (text alebo popis fotky)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getMobileUser(req);
  if (!user) return unauthorized();
  const json = await req.json().catch(() => ({}));
  const r = await editMessage(id, user.id, json?.body);
  return NextResponse.json(r.status === 200 ? r.data : { error: r.error }, { status: r.status });
}

// DELETE — zmazanie vlastnej správy kedykoľvek, zmizne obom
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getMobileUser(req);
  if (!user) return unauthorized();
  const r = await deleteMessage(id, user.id);
  return NextResponse.json(r.status === 200 ? r.data : { error: r.error }, { status: r.status });
}
