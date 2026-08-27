import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteImageByUrl } from '@/lib/cloudinary';

export async function DELETE(req: Request, { params }: { params: { episodeId: string; photoId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }
  const photo = await prisma.moviePhoto.findFirst({ where: { id: params.photoId, episodeId: params.episodeId }, select: { full: true } });
  await prisma.moviePhoto.deleteMany({ where: { id: params.photoId, episodeId: params.episodeId } });
  if (photo?.full) await deleteImageByUrl(photo.full);
  return NextResponse.json({ ok: true });
}
