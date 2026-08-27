import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateImageDataUrl } from '@/lib/validateUpload';
import { uploadImage, deleteImageByUrl } from '@/lib/cloudinary';

export async function PATCH(req: Request, { params }: { params: { id: string; videoId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, any> = {};

  let oldImage: string | null = null;
  if ('previewImage' in body) {
    const imageError = validateImageDataUrl(body.previewImage);
    if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });
    let imageUrl = body.previewImage || null;
    if (imageUrl && imageUrl.startsWith('data:image')) {
      const current = await prisma.movieVideo.findUnique({ where: { id: params.videoId }, select: { previewImage: true } });
      oldImage = current?.previewImage || null;
      imageUrl = await uploadImage(imageUrl, 'videos/previews');
    }
    data.previewImage = imageUrl;
  }
  if ('featuredOnHome' in body) {
    data.featuredOnHome = !!body.featuredOnHome;
  }

  const video = await prisma.movieVideo.updateMany({
    where: { id: params.videoId, movieId: params.id },
    data
  });
  if (video.count === 0) return NextResponse.json({ error: 'Video sa nenašlo.' }, { status: 404 });
  if (oldImage && oldImage !== data.previewImage) await deleteImageByUrl(oldImage);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string; videoId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }
  const video = await prisma.movieVideo.findFirst({ where: { id: params.videoId, movieId: params.id }, select: { previewImage: true } });
  await prisma.movieVideo.deleteMany({ where: { id: params.videoId, movieId: params.id } });
  if (video?.previewImage) await deleteImageByUrl(video.previewImage);
  return NextResponse.json({ ok: true });
}
