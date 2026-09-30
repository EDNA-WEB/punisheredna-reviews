import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteImageByUrl } from '@/lib/cloudinary';

const DELETE_WINDOW_MS = 30 * 60 * 1000;

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { params } = { ...ctx, params: await ctx.params };
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const myId = (session.user as any).id;

  const message = await prisma.message.findUnique({ where: { id: params.id } });
  if (!message) return NextResponse.json({ error: 'Zpráva se nenašla.' }, { status: 404 });
  if (message.senderId !== myId) {
    return NextResponse.json({ error: 'Můžeš mazat jen vlastní zprávy.' }, { status: 403 });
  }
  if (Date.now() - message.createdAt.getTime() > DELETE_WINDOW_MS) {
    return NextResponse.json({ error: 'Zprávu je možné smazat jen do 30 minut od odeslání.' }, { status: 403 });
  }
  if (message.read) {
    return NextResponse.json({ error: 'Tuto zprávu už druhá strana viděla, nedá se smazat.' }, { status: 403 });
  }

  if (message.image) await deleteImageByUrl(message.image);
  await prisma.message.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
