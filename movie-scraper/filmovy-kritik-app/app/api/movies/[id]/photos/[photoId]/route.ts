import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteImageByUrl } from '@/lib/cloudinary';

// Vráti plnú (väčšiu) verziu fotky — na požiadanie, keď návštevník naozaj
// klikne na náhľad. Nič sa zbytočne neposiela vopred pri načítaní stránky.
export async function GET(req: Request, { params }: { params: { id: string; photoId: string } }) {
  const photo = await prisma.moviePhoto.findFirst({
    where: { id: params.photoId, movieId: params.id },
    select: { full: true }
  });
  if (!photo) return NextResponse.json({ error: 'Fotka sa nenašla.' }, { status: 404 });
  return NextResponse.json({ full: photo.full });
}

export async function DELETE(req: Request, { params }: { params: { id: string; photoId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }
  const photo = await prisma.moviePhoto.findFirst({ where: { id: params.photoId, movieId: params.id }, select: { full: true } });
  await prisma.moviePhoto.deleteMany({ where: { id: params.photoId, movieId: params.id } });
  if (photo?.full) await deleteImageByUrl(photo.full);
  return NextResponse.json({ ok: true });
}
