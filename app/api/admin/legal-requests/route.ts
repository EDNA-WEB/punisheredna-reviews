import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function admin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return null;
  return session.user as any;
}

const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Nová žiadosť orgánu
export async function POST(req: Request) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const authority = str(b.authority, 200);
  const referenceNo = str(b.referenceNo, 120);
  const legalBasis = str(b.legalBasis, 300);
  const scope = str(b.scope);
  if (!authority || !referenceNo || !legalBasis || !scope) return NextResponse.json({ error: 'Vyplňte všechna povinná pole.' }, { status: 400 });
  const receivedAt = b.receivedAt ? new Date(b.receivedAt) : new Date();
  const r = await prisma.legalRequest.create({
    data: {
      authority,
      referenceNo,
      legalBasis,
      scope,
      note: str(b.note) || null,
      receivedAt: isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
      handledBy: String(user.name || user.email || user.id).slice(0, 120)
    }
  });
  return NextResponse.json(r, { status: 201 });
}

// Úprava: čo bolo vydané, stav
export async function PATCH(req: Request) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: 'Nemáš oprávnění.' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (typeof b.id !== 'string') return NextResponse.json({ error: 'Chybí ID.' }, { status: 400 });
  const status = ['open', 'done', 'rejected'].includes(b.status) ? b.status : undefined;
  const r = await prisma.legalRequest.update({
    where: { id: b.id },
    data: { ...(status ? { status } : {}), ...(typeof b.provided === 'string' ? { provided: str(b.provided) || null } : {}), ...(typeof b.note === 'string' ? { note: str(b.note) || null } : {}) }
  });
  return NextResponse.json(r);
}
