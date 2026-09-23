import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await prisma.qrLoginSession.findUnique({ where: { id: params.id } });
  if (!session) return NextResponse.json({ status: 'expired' });

  if (session.status === 'pending' && session.expiresAt < new Date()) {
    await prisma.qrLoginSession.update({ where: { id: session.id }, data: { status: 'expired' } });
    return NextResponse.json({ status: 'expired' });
  }

  return NextResponse.json({ status: session.status });
}
