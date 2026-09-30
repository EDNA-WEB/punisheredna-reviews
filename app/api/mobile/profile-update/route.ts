import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { validateImageDataUrl } from '@/lib/validateUpload';
import { uploadImage } from '@/lib/cloudinary';
import { deleteImageByUrl } from '@/lib/cloudinary';
import { recordProfileChanges } from '@/lib/activityFeed';

export const dynamic = 'force-dynamic';

// Appková verzia — zjednocuje polia z web endpointov /api/profile (bio,
// avatar) a /api/profile/account (meno, priezvisko, pohlavie, krajina,
// dátum narodenia) do jedného volania, nech appka nemusí robiť dve.
export async function POST(req: Request) {
  try {
    const authUser = await getMobileUser(req);
    if (!authUser) return NextResponse.json({ error: 'Neplatné nebo vypršelé přihlášení.' }, { status: 401 });

    const body = await req.json();
    const data: Record<string, any> = {};

    if ('firstName' in body) data.firstName = body.firstName ? String(body.firstName).trim() : null;
    if ('lastName' in body) data.lastName = body.lastName ? String(body.lastName).trim() : null;
    if ('gender' in body) data.gender = body.gender || null;
    if ('country' in body) data.country = body.country || null;
    if ('birthDate' in body) data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
    if ('bio' in body) {
      if (body.bio && String(body.bio).length > 1000) {
        return NextResponse.json({ error: 'Text "kdo jsem" může mít nejvýše 1000 znaků.' }, { status: 400 });
      }
      data.bio = body.bio ? String(body.bio).trim() : null;
    }

    let oldAvatar: string | null = null;
    if ('avatar' in body && body.avatar) {
      const avatarError = validateImageDataUrl(body.avatar);
      if (avatarError) return NextResponse.json({ error: avatarError }, { status: 400 });
      let avatarUrl = body.avatar;
      if (avatarUrl.startsWith('data:image')) {
        const current = await prisma.user.findUnique({ where: { id: authUser.id }, select: { avatar: true } });
        oldAvatar = current?.avatar || null;
        avatarUrl = await uploadImage(avatarUrl, 'avatars');
      }
      data.avatar = avatarUrl;
    } else if ('avatar' in body && body.avatar === null) {
      const current = await prisma.user.findUnique({ where: { id: authUser.id }, select: { avatar: true } });
      oldAvatar = current?.avatar || null;
      data.avatar = null;
    }

    const updated = await prisma.user.update({ where: { id: authUser.id }, data });
    // getMobileUser vracia celý záznam používateľa pred úpravou — slúži ako "pred".
    await recordProfileChanges(authUser.id, authUser, updated);
    if (oldAvatar && oldAvatar !== updated.avatar) await deleteImageByUrl(oldAvatar);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/mobile/profile-update]', error);
    return NextResponse.json({ error: 'Uložení se nezdařilo. Zkus to prosím znovu.' }, { status: 400 });
  }
}
