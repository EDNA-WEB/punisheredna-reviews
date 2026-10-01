import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteMessage } from '@/lib/messageActions';

// Zmazanie vlastnej správy — kedykoľvek, zmizne obom (aj fotka a hlasovka).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const r = await deleteMessage(id, (session.user as any).id);
  return NextResponse.json(r.status === 200 ? r.data : { error: r.error }, { status: r.status });
}
