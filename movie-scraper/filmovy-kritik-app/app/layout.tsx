import type { Metadata } from 'next';
import { Poppins, Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import Providers from './providers';
import { TranslationProvider } from '@/components/TranslationProvider';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import SiteWallpaper from '@/components/SiteWallpaper';
import TopBar from '@/components/TopBar';
import Navbar from '@/components/Navbar';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import SiteFooter from '@/components/SiteFooter';
import TvNavigation from '@/components/TvNavigation';

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

export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'PunisherEDNA reviews', template: '%s | PunisherEDNA reviews' },
  description: 'Filmové recenzie od PunisherEDNA — úprimné pohľady na filmy, ktoré stoja za reč aj za mlčanie.',
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
  const language = await getUserLanguage();
  const dict = await getDictionary(language);

  return (
    <html lang={language} className={theme}>
      <head>
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
        <TranslationProvider dict={dict}>
          <Providers>
            <TvNavigation />
            <SiteWallpaper />
            <TopBar />
            <Navbar />
            <div className="max-w-6xl mx-auto px-5 sm:px-6 pb-20 bg-bg sm:shadow-[0_0_40px_rgba(0,0,0,0.06)] min-h-screen">
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
