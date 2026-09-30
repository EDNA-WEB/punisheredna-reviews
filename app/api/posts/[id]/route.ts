import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isActiveMember } from '@/lib/membership';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { params } = { ...ctx, params: await ctx.params };
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: 'Příspěvek se nenašel.' }, { status: 404 });

  const isAdmin = (session.user as any).role === 'ADMIN';
  const isOwner = post.authorId === (session.user as any).id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Nemáš oprávnění smazat tento příspěvek.' }, { status: 403 });
  }
  if (isOwner && !isAdmin && !(await isActiveMember((session.user as any).id))) {
    return NextResponse.json({ error: 'Mazání vlastních příspěvků je dostupné jen pro Golden Ticket členy.' }, { status: 403 });
  }

  await prisma.post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
