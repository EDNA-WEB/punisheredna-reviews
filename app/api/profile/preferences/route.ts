import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkKeyRateLimit } from '@/lib/ipRateLimit';
import { cookies } from 'next/headers';
import { parseConsentCookie, isConsentGranted } from '@/lib/privacyDefaults';

const SUPPORTED_LANGUAGES = ['sk', 'en', 'cs'];

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Musíš byť prihlásený.' }, { status: 401 });
  const userId = (session.user as any).id;

  if (!checkKeyRateLimit(`preferences:${userId}`, 60_000, 20)) {
    return NextResponse.json({ error: 'Príliš veľa zmien za krátky čas.' }, { status: 429 });
  }

  const consent = parseConsentCookie(cookies().get('privacy_consent')?.value);
  if (!isConsentGranted(consent, 'preferences')) {
    return NextResponse.json(
      { error: 'Vypol/-a si "Uloženie preferencií" v Nastavení súkromia, takže sa táto zmena neuloží natrvalo.', saved: false },
      { status: 200 }
    );
  }

  const { timezone, language } = await req.json();
  const data: any = {};

  if (typeof timezone === 'string') {
    if (timezone.length > 100) return NextResponse.json({ error: 'Neplatné časové pásmo.' }, { status: 400 });
    data.timezone = timezone || null;
  }
  if (typeof language === 'string') {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return NextResponse.json({ error: 'Nepodporovaný jazyk.' }, { status: 400 });
    }
    data.language = language;
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json({ timezone: updated.timezone, language: updated.language });
}
