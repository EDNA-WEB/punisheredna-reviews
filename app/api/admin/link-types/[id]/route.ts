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
  const type = await prisma.movieLinkType.findUnique({ where: { id: params.id }, select: { icon: true } });
  // Zmazanie typu z katalógu automaticky zmaže aj jeho priradenia k filmom
  // (onDelete: Cascade na MovieLink).
  await prisma.movieLinkType.delete({ where: { id: params.id } });
  if (type?.icon) await deleteImageByUrl(type.icon);
  return NextResponse.json({ ok: true });
}
