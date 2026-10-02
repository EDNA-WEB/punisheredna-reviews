import type { Metadata, Viewport } from 'next';
import { Poppins, Inter } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { detectTvMode } from '@/lib/tvMode';
import './globals.css';
import Providers from './providers';
import { TranslationProvider } from '@/components/TranslationProvider';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import SiteWallpaper from '@/components/SiteWallpaper';
import SiteStatsPanel from '@/components/SiteStatsPanel';
import TopBar from '@/components/TopBar';
import Navbar from '@/components/Navbar';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import SiteFooter from '@/components/SiteFooter';
import SiteChrome from '@/components/SiteChrome';
import GuestSiteCount from '@/components/GuestSiteCount';
import GuestShell from '@/components/GuestShell';
import HideOnShared from '@/components/HideOnShared';
import TvNavigation from '@/components/TvNavigation';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import TvModeToggle from '@/components/TvModeToggle';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isActiveMember } from '@/lib/membership';

import { safeJsonLd } from '@/lib/jsonLd';
const display = Poppins({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  weight: ['600', '700', '800']
});
const body = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700']
});

// Vynúti dynamické (server-side, nie statické) vykresľovanie pri každej HTTP požiadavke.
export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function generateViewport(): Promise<Viewport> {
  const isTv = await detectTvMode();
  // Mnohé Smart TV prehliadače nesprávne vyhodnotia "width=device-width" a
  // spustia namiesto desktopového rozloženia mobilné (malá "layout" šírka
  // napriek veľkej fyzickej obrazovke). Pri TV preto vynútime pevnú,
  // dostatočne širokú šírku pohľadu — web sa tak vždy vykreslí presne v
  // rovnakom (desktopovom) režime, aký pozná z počítača.
  return {
    themeColor: '#0F1013',
    width: isTv ? 1280 : 'device-width',
    initialScale: 1
  };
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'KrálFilmu.cz — recenze a hodnocení filmů a seriálů', template: '%s | KrálFilmu.cz' },
  description: 'KrálFilmu.cz — recenze, hodnocení a vše ze světa filmu. Premiéry v kinech i na VOD, herci, tvůrci a diskuze.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KrálFilmu'
  },
  alternates: {
    types: { 'application/rss+xml': [{ url: '/feed.xml', title: 'KrálFilmu.cz — Novinky (RSS)' }] }
  },
  openGraph: {
    siteName: 'KrálFilmu.cz',
    type: 'website',
    locale: 'cs_CZ',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'KrálFilmu.cz' }]
  },
  twitter: { card: 'summary_large_image', images: ['/og-image.png'] }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get('theme')?.value === 'dark' ? 'dark' : '';

  // Steam téma už nie je manuálne prepínateľná cez "?theme=steam" (to by
  // obchádzalo exkluzivitu) — je to teraz automaticky nová podoba TMAVÉHO
  // režimu pre Golden Ticket členov. Neplatiaci v tmavom režime vidia
  // pôvodnú, jednoduchú čiernu tému.
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  // Vypočítané NEZÁVISLE od aktuálneho theme cookie — potrebné aj v svetlom
  // režime, aby prepínacie tlačidlo na klientovi vedelo OKAMŽITE (bez čakania
  // na obnovenie zo servera), či má pri prepnutí na tmavý režim rovno pridať
  // aj Steam paletu, namiesto krátkeho bliknutia obyčajnej čiernej.
  const hasSteamEligibility = isAdmin || (await isActiveMember((session?.user as any)?.id));
  const isMember = theme === 'dark' && hasSteamEligibility;
  const themeVariant = isMember ? 'theme-steam' : '';

  const language = await getUserLanguage();
  const dict = await getDictionary(language);

  const isTv = await detectTvMode();

  return (
    <html
      lang={language}
      className={`${theme} ${themeVariant} ${isTv ? 'tv-mode' : ''}`.trim()}
      data-steam-eligible={hasSteamEligibility ? 'true' : 'false'}
    >
      <head>
        {/* Next.js generuje z "appleWebApp" v metadata len starší, Apple-špecifický
            tag "apple-mobile-web-app-capable" — moderné prehliadače (aj Chrome)
            odporúčajú popri ňom aj tento novší, štandardizovaný ekvivalent. */}
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          nonce={(await headers()).get('x-nonce') ?? undefined}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'KrálFilmu.cz',
              url: siteUrl,
              potentialAction: {
                '@type': 'SearchAction',
                target: `${siteUrl}/recenzie/filter?q={search_term_string}`,
                'query-input': 'required name=search_term_string'
              }
            })
          }}
        />
      </head>
      <body className={`${display.variable} ${body.variable} font-body text-ink overflow-x-hidden`}>
        <ServiceWorkerRegister />
        <TvModeToggle />
        <TranslationProvider dict={dict}>
          <Providers>
            {session ? (
              // V administrácii sa verejná obálka skryje (components/SiteChrome.tsx).
              <SiteChrome
                top={
                  <>
                    <TvNavigation />
                    <SiteWallpaper />
                    <SiteStatsPanel />
                    <TopBar />
                    <Navbar />
                  </>
                }
                footer={<SiteFooter />}
              >
                {children}
              </SiteChrome>
            ) : (
              // Neprihlásený: len formulár v strede + počet filmov. Žiadna navigácia,
              // panely ani pätička — obsah webu je skrytý (middleware.ts ho aj tak
              // presmeruje sem z akejkoľvek inej adresy).
              // Na zdieľanom článku (/sdilet/…) len samotný článok (components/GuestShell.tsx).
              <GuestShell wallpaper={<SiteWallpaper />} count={<GuestSiteCount />}>
                {children}
              </GuestShell>
            )}
            <HideOnShared>
              <CookieConsentBanner />
            </HideOnShared>
          </Providers>
        </TranslationProvider>
      </body>
    </html>
  );
}
