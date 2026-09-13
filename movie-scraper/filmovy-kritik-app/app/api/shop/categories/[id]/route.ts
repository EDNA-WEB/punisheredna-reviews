import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { name, icon, order } = await req.json();
  const category = await prisma.shopCategory.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(icon !== undefined ? { icon: icon || null } : {}),
      ...(order !== undefined ? { order } : {})
    }
  });
  return NextResponse.json(category);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  await prisma.shopCategory.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
