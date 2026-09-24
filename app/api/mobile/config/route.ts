import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Verejné, nezmenlivé nastavenia pre appku — hlavne tapeta webu, nech appka
// vyzerá vizuálne súdržne s webom (Administrácia → Nastavenia → tapeta).
export async function GET() {
  const settings = await prisma.settings.findUnique({
    where: { id: 'singleton' },
    select: { mobileWallpaper: true }
  });

  return NextResponse.json({ wallpaperUrl: settings?.mobileWallpaper || null });
}
