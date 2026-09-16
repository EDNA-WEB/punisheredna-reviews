import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import WallpaperForm from '@/components/WallpaperForm';
import AppAndSocialLinksForm from '@/components/AppAndSocialLinksForm';
import PrivacyModalTextForm from '@/components/PrivacyModalTextForm';
import CookiesPolicyForm from '@/components/CookiesPolicyForm';

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });

  return (
    <div className="pt-8">
      <AdminTabs />
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Vzhľad webu</h1>
      <p className="text-muted mb-8">
        Tapeta sa zobrazí na pozadí po stranách stránky na širokých obrazovkách — presne tam, kde by inak bol
        priestor na reklamu.
      </p>
      <WallpaperForm initial={settings?.wallpaper || null} />

      <div className="mt-12 pt-8 border-t border-line">
        <h2 className="font-display font-bold text-xl text-ink mb-2">Aplikácia a sociálne siete</h2>
        <p className="text-muted mb-8">
          Zobrazí sa na hlavnej stránke pod rebríčkami. Prázdne polia sa jednoducho nezobrazia.
        </p>
        <AppAndSocialLinksForm
          initial={{
            appStoreUrl: settings?.appStoreUrl || null,
            googlePlayUrl: settings?.googlePlayUrl || null,
            facebookUrl: settings?.facebookUrl || null,
            instagramUrl: settings?.instagramUrl || null,
            tiktokUrl: settings?.tiktokUrl || null,
            youtubeUrl: settings?.youtubeUrl || null
          }}
        />
      </div>

      <div className="mt-12 pt-8 border-t border-line">
        <h2 className="font-display font-bold text-xl text-ink mb-2">Nastavenie súkromia</h2>
        <p className="text-muted mb-8">
          Text, ktorý sa zobrazí v modálnom okne, keď niekto klikne na "Nastavenie súkromia" v pätičke hlavnej stránky.
        </p>
        <PrivacyModalTextForm initialText={settings?.privacyModalText || null} initialCategories={settings?.privacyCategories || null} />
      </div>

      <div className="mt-12 pt-8 border-t border-line">
        <h2 className="font-display font-bold text-xl text-ink mb-2">Stránka Cookies</h2>
        <p className="text-muted mb-8">
          Text, ktorý sa zobrazí na stránke /cookies, keď niekto klikne na "Cookies" v pätičke hlavnej stránky.
        </p>
        <CookiesPolicyForm initial={settings?.cookiesPolicyText || null} />
      </div>
    </div>
  );
}
