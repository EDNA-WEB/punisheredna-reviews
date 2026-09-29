import { NextResponse } from 'next/server';
import { cdnHeaders } from '@/lib/memoCache';
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
    select: { mobileWallpaper: true, mobileLogo: true, facebookUrl: true, instagramUrl: true, tiktokUrl: true, youtubeUrl: true }
  });

  return NextResponse.json({
    wallpaperUrl: settings?.mobileWallpaper || null,
    logoUrl: settings?.mobileLogo || null,
    facebookUrl: settings?.facebookUrl || null,
    instagramUrl: settings?.instagramUrl || null,
    tiktokUrl: settings?.tiktokUrl || null,
    youtubeUrl: settings?.youtubeUrl || null
  }, { headers: cdnHeaders(3600) });
}
