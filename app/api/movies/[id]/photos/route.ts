import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateImageDataUrl } from '@/lib/validateUpload';
import { uploadImage, cloudinaryThumbnailUrl } from '@/lib/cloudinary';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return null;
  return session;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });

  const { thumbnail, full } = await req.json();
  if (!full) return NextResponse.json({ error: 'Chýba fotka.' }, { status: 400 });

  const fullError = validateImageDataUrl(full);
  if (fullError) return NextResponse.json({ error: fullError }, { status: 400 });

  const count = await prisma.moviePhoto.count({ where: { movieId: params.id } });
  if (count >= 30) {
    return NextResponse.json({ error: 'Fotogaléria môže mať najviac 30 fotiek.' }, { status: 400 });
  }

  // Nahráme len JEDEN (plný) obrázok — miniatúra je len tá istá adresa so
  // zmenšovacou transformáciou v URL, nie samostatný nahraný súbor.
  let fullUrl = full;
  if (fullUrl.startsWith('data:image')) {
    fullUrl = await uploadImage(fullUrl, 'movies/gallery');
  }
  const thumbnailUrl = cloudinaryThumbnailUrl(fullUrl, 300);

  const photo = await prisma.moviePhoto.create({
    data: { movieId: params.id, thumbnail: thumbnailUrl, full: fullUrl, order: count }
  });

  return NextResponse.json({ id: photo.id, thumbnail: photo.thumbnail });
}
