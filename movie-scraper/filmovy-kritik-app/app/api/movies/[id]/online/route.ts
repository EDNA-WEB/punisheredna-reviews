import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateImageDataUrl } from '@/lib/validateUpload';
import { uploadImage, deleteImageByUrl } from '@/lib/cloudinary';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, any> = {};

  if ('watchUrl' in body) {
    const url = String(body.watchUrl || '').trim();
    if (url && !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'Odkaz musí začínať na http:// alebo https://' }, { status: 400 });
    }
    data.watchUrl = url || null;
  }

  if ('isCamVersion' in body) {
    data.isCamVersion = !!body.isCamVersion;
  }

  let oldImage: string | null = null;
  if ('onlineImage' in body) {
    if (body.onlineImage) {
      const imageError = validateImageDataUrl(body.onlineImage);
      if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });
    }
    let imageUrl = body.onlineImage || null;
    if (imageUrl && imageUrl.startsWith('data:image')) {
      const current = await prisma.movie.findUnique({ where: { id: params.id }, select: { onlineImage: true } });
      oldImage = current?.onlineImage || null;
      imageUrl = await uploadImage(imageUrl, 'movies/online');
    }
    data.onlineImage = imageUrl;
  }

  const movie = await prisma.movie.update({ where: { id: params.id }, data });
  if (oldImage && oldImage !== movie.onlineImage) await deleteImageByUrl(oldImage);
  return NextResponse.json({ ok: true, watchUrl: movie.watchUrl, onlineImage: movie.onlineImage, isCamVersion: movie.isCamVersion });
}
