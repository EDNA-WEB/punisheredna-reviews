import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authOptions, forgetUserSessionCache } from '@/lib/auth';
import { deleteImageByUrl } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  const { password } = await req.json();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Účet se nenašel.' }, { status: 404 });

  const passwordOk = await bcrypt.compare(String(password || ''), user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json({ error: 'Nesprávné heslo.' }, { status: 400 });
  }

  // Jedinečná, nikam neprihlásiteľná náhrada za meno/e-mail — recenzie a príspevky
  // ostávajú zachované, len sa autor zobrazuje ako "Zmazaný používateľ".
  const suffix = user.id.slice(-6);
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(randomPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      deleted: true,
      // Bezpečnosť: zmazaný účet sa okamžite odhlási zo všetkých zariadení.
      passwordChangedAt: new Date(),
      name: `Smazaný uživatel ${suffix}`,
      email: `deleted-${suffix}@deleted.punisheredna.internal`,
      passwordHash,
      avatar: null,
      bio: null,
      firstName: null,
      lastName: null,
      gender: null,
      birthDate: null,
      tagline: null,
      hideEmail: true,
      homepage: null,
      facebookUrl: null,
      instagramUrl: null,
      tiktokUrl: null,
      xUrl: null,
      youtubeUrl: null,
      spotifyUrl: null,
      linkedinUrl: null,
      snapchatUrl: null,
      blueskyUrl: null,
      country: null,
      region: null,
      recoveryCode: null
    }
  });

  // Odhlásiť všade, prestať posielať push notifikácie a zmazať profilovú fotku.
  forgetUserSessionCache(userId);
  await prisma.pushToken.deleteMany({ where: { userId } }).catch((err) => console.error('[delete-account] push', err));
  if (user.avatar) {
    const shared = await prisma.user.count({ where: { avatar: user.avatar, id: { not: userId } } });
    if (shared === 0) await deleteImageByUrl(user.avatar, { folder: 'avatars' });
  }

  return NextResponse.json({ ok: true });
}
