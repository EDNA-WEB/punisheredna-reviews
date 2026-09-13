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
  if ('autoFromYoutube' in body && body.autoFromYoutube) {
    // YouTube pre každé video automaticky poskytuje náhľadový obrázok na tejto
    // adrese — netreba žiadne API ani kľúč, len ID videa, čo už v databáze máme.
    const current = await prisma.movieVideo.findUnique({ where: { id: params.videoId }, select: { previewImage: true, url: true } });
    const videoId = current?.url?.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (!videoId) return NextResponse.json({ error: 'Nepodarilo sa zistiť ID YouTube videa.' }, { status: 400 });

    try {
      oldImage = current?.previewImage || null;
      // "maxresdefault" (najvyššia kvalita) nemajú úplne všetky YouTube videá —
      // ak neexistuje, YouTube namiesto chyby vráti malý sivý zástupný obrázok,
      // preto overíme jeho veľkosť a v takom prípade padneme na nižšie
      // rozlíšenie ("hqdefault"), čo existuje garantovane pri každom videu.
      let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      const check = await fetch(thumbnailUrl, { method: 'HEAD' });
      const size = parseInt(check.headers.get('content-length') || '0', 10);
      if (!check.ok || size < 2000) {
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
      data.previewImage = await uploadImage(thumbnailUrl, 'videos/previews');
    } catch {
      return NextResponse.json({ error: 'Stiahnutie náhľadu z YouTube zlyhalo.' }, { status: 500 });
    }
  } else if ('previewImage' in body) {
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

  return NextResponse.json({ ok: true, previewImage: data.previewImage });
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
