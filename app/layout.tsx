import type { Metadata, Viewport } from 'next';
import { Poppins, Inter } from 'next/font/google';
import { cookies } from 'next/headers';
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
import TvNavigation from '@/components/TvNavigation';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import TvModeToggle from '@/components/TvModeToggle';
import ThemeVariantToggle from '@/components/ThemeVariantToggle';

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

export function generateViewport(): Viewport {
  const isTv = detectTvMode();
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
  title: { default: 'PunisherEDNA reviews', template: '%s | PunisherEDNA reviews' },
  description: 'Filmové recenzie od PunisherEDNA — úprimné pohľady na filmy, ktoré stoja za reč aj za mlčanie.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PunisherEDNA'
  },
  alternates: {
    types: { 'application/rss+xml': [{ url: '/feed.xml', title: 'PunisherEDNA reviews — Novinky (RSS)' }] }
  },
  openGraph: {
    siteName: 'PunisherEDNA reviews',
    type: 'website',
    locale: 'sk_SK'
  },
  twitter: { card: 'summary_large_image' }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = cookies().get('theme')?.value === 'dark' ? 'dark' : '';
  const themeVariant = cookies().get('themeVariant')?.value === 'steam' ? 'theme-steam' : '';
  const language = await getUserLanguage();
  const dict = await getDictionary(language);

  const isTv = detectTvMode();

  return (
    <html lang={language} className={`${theme} ${themeVariant} ${isTv ? 'tv-mode' : ''}`.trim()}>
      <head>
        {/* Next.js generuje z "appleWebApp" v metadata len starší, Apple-špecifický
            tag "apple-mobile-web-app-capable" — moderné prehliadače (aj Chrome)
            odporúčajú popri ňom aj tento novší, štandardizovaný ekvivalent. */}
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'PunisherEDNA reviews',
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
        <ThemeVariantToggle />
        <TranslationProvider dict={dict}>
          <Providers>
            <TvNavigation />
            <SiteWallpaper />
            <SiteStatsPanel />
            <TopBar />
            <Navbar />
            <div className="main-content-shell max-w-6xl mx-auto px-5 sm:px-6 pb-20 bg-bg sm:shadow-[0_0_40px_rgba(0,0,0,0.06)] min-h-screen">
              {children}
              <SiteFooter />
            </div>
            <CookieConsentBanner />
          </Providers>
        </TranslationProvider>
      </body>
    </html>
  );
}
