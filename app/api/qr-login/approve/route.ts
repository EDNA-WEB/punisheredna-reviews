import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Chýba id relácie.' }, { status: 400 });

  const qrSession = await prisma.qrLoginSession.findUnique({ where: { id } });
  if (!qrSession) return NextResponse.json({ error: 'Tento QR kód už neplatí.' }, { status: 404 });
  if (qrSession.status !== 'pending' || qrSession.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Tento QR kód už vypršal alebo bol už použitý.' }, { status: 400 });
  }

  // Atomická zmena "pending" → "approved" (WHERE sa vyhodnotí na úrovni
  // databázy) — vylučuje, aby dve súbežné požiadavky obe uspeli.
  const { count } = await prisma.qrLoginSession.updateMany({
    where: { id, status: 'pending' },
    data: { status: 'approved', userId: (session.user as any).id }
  });
  if (count === 0) {
    return NextResponse.json({ error: 'Tento QR kód už vypršal alebo bol už použitý.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
