import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteImageByUrl } from '@/lib/cloudinary';

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
