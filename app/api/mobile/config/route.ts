import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DÔLEŽITÉ: bez tohto riadku by Next.js mohol túto cestu považovať za
// "statickú" a odpoveď si raz uložiť do cache — takže appka by dostávala
// STARÚ hodnotu tapety aj po jej zmene v administrácii. "force-dynamic"
// zaručí, že sa databáza vždy naozaj overí nanovo pri každom volaní.
export const dynamic = 'force-dynamic';

// Verejné, nezmenlivé nastavenia pre appku — hlavne tapeta webu, nech appka
// vyzerá vizuálne súdržne s webom (Administrácia → Nastavenia → tapeta).
export async function GET() {
  const settings = await prisma.settings.findUnique({
    where: { id: 'singleton' },
    select: { mobileWallpaper: true }
  });

  return NextResponse.json({ wallpaperUrl: settings?.mobileWallpaper || null });
}
