import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteImageByUrl } from '@/lib/cloudinary';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { name, icon, color } = await req.json();
  const data: Record<string, any> = {};
  if (typeof name === 'string' && name.trim()) data.name = name.trim();
  if (icon !== undefined) data.icon = icon || null;
  if (color !== undefined) data.color = color || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nič na úpravu.' }, { status: 400 });
  }

  try {
    const updated = await prisma.streamingService.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Služba s týmto názvom už v katalógu existuje.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Úprava zlyhala.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }
  const service = await prisma.streamingService.findUnique({ where: { id: params.id }, select: { icon: true } });
  // Zmazanie služby z katalógu automaticky zmaže aj jej priradenia k filmom
  // (onDelete: Cascade na MovieStreamingService), takže netreba mazať zvlášť.
  await prisma.streamingService.delete({ where: { id: params.id } });
  if (service?.icon) await deleteImageByUrl(service.icon);
  return NextResponse.json({ ok: true });
}
