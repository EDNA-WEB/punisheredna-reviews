import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Údaje o prevádzkovateľovi pre stránku /provozovatel (Administrace → Vzhled webu).
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const clean = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const operatorEmail = clean(body?.operatorEmail, 200);
  if (operatorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operatorEmail)) {
    return NextResponse.json({ error: 'Neplatný e-mail.' }, { status: 400 });
  }
  const data = {
    operatorName: clean(body?.operatorName, 200),
    operatorCompanyId: clean(body?.operatorCompanyId, 40),
    operatorAddress: clean(body?.operatorAddress, 300),
    operatorEmail
  };
  await prisma.settings.upsert({ where: { id: 'singleton' }, update: data, create: { id: 'singleton', ...data } });
  return NextResponse.json({ ok: true });
}
