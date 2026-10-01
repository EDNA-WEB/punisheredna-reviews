import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isPhotoAvailable } from '@/lib/photoMessages';

// Pôvodne jednorazové fotky (zmazané 1 min po zobrazení). Teraz platí 24 h
// od odoslania — táto routa fotku len vráti, kým je dostupná.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš být přihlášen.' }, { status: 401 });
  const myId = (session.user as any).id;

  const message = await prisma.message.findUnique({ where: { id } });
  if (!message || (message.receiverId !== myId && message.senderId !== myId)) {
    return NextResponse.json({ error: 'Zpráva se nenašla.' }, { status: 404 });
  }
  if (!isPhotoAvailable(message)) {
    return NextResponse.json({ error: 'Fotka vypršela.' }, { status: 410 });
  }
  return NextResponse.json({ image: message.image });
}
