import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { validateSafeUrl } from '@/lib/validateUpload';
import { uploadImage, deleteImageByUrl } from '@/lib/cloudinary';

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });
  return NextResponse.json({
    wallpaper: settings?.wallpaper || null,
    appStoreUrl: settings?.appStoreUrl || null,
    googlePlayUrl: settings?.googlePlayUrl || null,
    facebookUrl: settings?.facebookUrl || null,
    instagramUrl: settings?.instagramUrl || null,
    tiktokUrl: settings?.tiktokUrl || null,
    youtubeUrl: settings?.youtubeUrl || null,
    privacyModalText: settings?.privacyModalText || null,
    privacyCategories: settings?.privacyCategories || null,
    cookiesPolicyText: settings?.cookiesPolicyText || null,
    registrationsEnabled: settings?.registrationsEnabled ?? true
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const body = await req.json();
  const { wallpaper, appStoreUrl, googlePlayUrl, facebookUrl, instagramUrl, tiktokUrl, youtubeUrl, privacyModalText, privacyCategories, cookiesPolicyText, registrationsEnabled } = body;

  for (const url of [appStoreUrl, googlePlayUrl, facebookUrl, instagramUrl, tiktokUrl, youtubeUrl]) {
    const urlError = validateSafeUrl(url);
    if (urlError) return NextResponse.json({ error: urlError }, { status: 400 });
  }
  if (privacyModalText && String(privacyModalText).length > 10000) {
    return NextResponse.json({ error: 'Text je príliš dlhý (max. 10 000 znakov).' }, { status: 400 });
  }
  if (cookiesPolicyText && String(cookiesPolicyText).length > 20000) {
    return NextResponse.json({ error: 'Text je príliš dlhý (max. 20 000 znakov).' }, { status: 400 });
  }
  if (privacyCategories) {
    try {
      const parsed = JSON.parse(privacyCategories);
      if (!Array.isArray(parsed)) throw new Error();
    } catch {
      return NextResponse.json({ error: 'Neplatný formát kategórií.' }, { status: 400 });
    }
  }

  // Dôležité: mení sa LEN to, čo formulár naozaj poslal — inak by uloženie jednej
  // sekcie (napr. odkazov) vynulovalo obsah všetkých ostatných sekcií (tapeta,
  // text súkromia, kategórie, text cookies), keďže by v tele požiadavky chýbali.
  const data: Record<string, any> = {};
  let oldWallpaper: string | null = null;
  if ('wallpaper' in body) {
    let wallpaperUrl = wallpaper || null;
    if (wallpaperUrl && wallpaperUrl.startsWith('data:image')) {
      const current = await prisma.settings.findUnique({ where: { id: 'singleton' }, select: { wallpaper: true } });
      oldWallpaper = current?.wallpaper || null;
      wallpaperUrl = await uploadImage(wallpaperUrl, 'settings');
    }
    data.wallpaper = wallpaperUrl;
  }
  if ('appStoreUrl' in body) data.appStoreUrl = appStoreUrl || null;
  if ('googlePlayUrl' in body) data.googlePlayUrl = googlePlayUrl || null;
  if ('facebookUrl' in body) data.facebookUrl = facebookUrl || null;
  if ('instagramUrl' in body) data.instagramUrl = instagramUrl || null;
  if ('tiktokUrl' in body) data.tiktokUrl = tiktokUrl || null;
  if ('youtubeUrl' in body) data.youtubeUrl = youtubeUrl || null;
  if ('privacyModalText' in body) data.privacyModalText = privacyModalText || null;
  if ('privacyCategories' in body) data.privacyCategories = privacyCategories || null;
  if ('cookiesPolicyText' in body) data.cookiesPolicyText = cookiesPolicyText || null;
  if ('registrationsEnabled' in body) data.registrationsEnabled = !!registrationsEnabled;

  const settings = await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data }
  });

  if (oldWallpaper && oldWallpaper !== settings.wallpaper) await deleteImageByUrl(oldWallpaper);

  return NextResponse.json(settings);
}
