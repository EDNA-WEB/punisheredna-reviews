import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateImageDataUrl } from '@/lib/validateUpload';
import { uploadImage, deleteImageByUrl } from '@/lib/cloudinary';

export async function PATCH(req: Request, { params }: { params: { seasonId: string; episodeId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const { title, synopsis, onlineImage, onlineUrl } = await req.json();
  if (title !== undefined && String(title).length > 200) {
    return NextResponse.json({ error: 'Názov je príliš dlhý (max. 200 znakov).' }, { status: 400 });
  }
  if (synopsis !== undefined && String(synopsis).length > 5000) {
    return NextResponse.json({ error: 'Obsah je príliš dlhý (max. 5000 znakov).' }, { status: 400 });
  }
  if (onlineImage) {
    const imageError = validateImageDataUrl(onlineImage);
    if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });
  }
  if (onlineUrl && !/^https?:\/\//i.test(onlineUrl)) {
    return NextResponse.json({ error: 'Odkaz musí začínať na http:// alebo https://' }, { status: 400 });
  }

  const data: Record<string, any> = {};
  if (title !== undefined) data.title = title ? String(title).trim() : null;
  if (synopsis !== undefined) data.synopsis = synopsis ? String(synopsis).trim() : null;
  if (onlineUrl !== undefined) data.onlineUrl = onlineUrl ? String(onlineUrl).trim() : null;

  let oldImage: string | null = null;
  if (onlineImage !== undefined) {
    let imageUrl = onlineImage || null;
    if (imageUrl && imageUrl.startsWith('data:image')) {
      const current = await prisma.episode.findUnique({ where: { id: params.episodeId }, select: { onlineImage: true } });
      oldImage = current?.onlineImage || null;
      imageUrl = await uploadImage(imageUrl, 'episodes/online');
    }
    data.onlineImage = imageUrl;
  }

  await prisma.episode.updateMany({
    where: { id: params.episodeId, seasonId: params.seasonId },
    data
  });

  if (oldImage && oldImage !== data.onlineImage) await deleteImageByUrl(oldImage);

  return NextResponse.json({ ok: true });
}
