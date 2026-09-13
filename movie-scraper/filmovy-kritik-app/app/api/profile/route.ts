import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateImageDataUrl } from '@/lib/validateUpload';
import { checkKeyRateLimit } from '@/lib/ipRateLimit';
import { uploadImage, deleteImageByUrl } from '@/lib/cloudinary';

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  if (!checkKeyRateLimit(`profile-update:${userId}`, 60_000, 10)) {
    return NextResponse.json({ error: 'Príliš veľa úprav za krátky čas. Skús to prosím o chvíľu.' }, { status: 429 });
  }

  const body = await req.json();
  const data: Record<string, any> = {};

  // Prezývka sa cez toto rozhranie (vlastné nastavenia používateľa) už nedá meniť.

  if ('bio' in body) {
    if (body.bio && String(body.bio).length > 1000) {
      return NextResponse.json({ error: 'Text „o mne“ môže mať najviac 1000 znakov.' }, { status: 400 });
    }
    data.bio = body.bio ? String(body.bio).trim() : null;
  }

  let oldAvatar: string | null = null;
  if ('avatar' in body) {
    const avatarError = validateImageDataUrl(body.avatar);
    if (avatarError) return NextResponse.json({ error: avatarError }, { status: 400 });
    let avatarUrl = body.avatar || null;
    if (avatarUrl && avatarUrl.startsWith('data:image')) {
      const current = await prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
      oldAvatar = current?.avatar || null;
      avatarUrl = await uploadImage(avatarUrl, 'avatars');
    }
    data.avatar = avatarUrl;
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });
  if (oldAvatar && oldAvatar !== updated.avatar) await deleteImageByUrl(oldAvatar);
  return NextResponse.json({ id: updated.id, name: updated.name, avatar: updated.avatar });
}
