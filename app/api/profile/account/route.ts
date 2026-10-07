import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateSafeUrl } from '@/lib/validateUpload';
import { checkKeyRateLimit } from '@/lib/ipRateLimit';
import { recordProfileChanges } from '@/lib/activityFeed';

const URL_FIELDS = ['homepage', 'facebookUrl', 'instagramUrl', 'tiktokUrl', 'xUrl', 'youtubeUrl', 'spotifyUrl', 'linkedinUrl', 'snapchatUrl', 'blueskyUrl'] as const;
const TEXT_FIELDS = ['firstName', 'lastName', 'gender', 'tagline', 'country', 'region'] as const;

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  if (!checkKeyRateLimit(`account-settings:${userId}`, 60_000, 15)) {
    return NextResponse.json({ error: 'Příliš mnoho změn za krátkou dobu.' }, { status: 429 });
  }

  const body = await req.json();
  const data: Record<string, any> = {};

  for (const field of TEXT_FIELDS) {
    if (field in body) {
      const value = body[field];
      if (value && String(value).length > 100) {
        return NextResponse.json({ error: 'Jedna z hodnot je příliš dlouhá.' }, { status: 400 });
      }
      data[field] = value ? String(value).trim() : null;
    }
  }

  if ('tagline' in body && body.tagline && String(body.tagline).length > 50) {
    return NextResponse.json({ error: '"Kdo jsem / čím jsem" může mít nejvýše 50 znaků.' }, { status: 400 });
  }

  for (const field of URL_FIELDS) {
    if (field in body) {
      const value = body[field];
      const urlError = validateSafeUrl(value);
      if (urlError) return NextResponse.json({ error: urlError }, { status: 400 });
      data[field] = value || null;
    }
  }

  if ('hideEmail' in body) data.hideEmail = !!body.hideEmail;

  if ('birthDate' in body) {
    data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
  }

  const before = await prisma.user.findUnique({ where: { id: userId } });
  const updated = await prisma.user.update({ where: { id: userId }, data });
  await recordProfileChanges(userId, before, updated);
  // Bezpečnosť: nevraciame celý záznam (obsahoval hash hesla, obnovovací kód a tokeny).
  return NextResponse.json({ ok: true });
}
