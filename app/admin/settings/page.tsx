import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import WallpaperForm from '@/components/WallpaperForm';
import MobileWallpaperForm from '@/components/MobileWallpaperForm';
import MobileLogoForm from '@/components/MobileLogoForm';
import AppAndSocialLinksForm from '@/components/AppAndSocialLinksForm';
import PrivacyModalTextForm from '@/components/PrivacyModalTextForm';
import CookiesPolicyForm from '@/components/CookiesPolicyForm';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Vzhled webu</>} />
      <p className="text-muted mb-8">
        Tapeta se zobrazí na pozadí po stranách stránky na širokých obrazovkách — přesně tam, kde by jinak bylo místo na reklamu.
      </p>
      <WallpaperForm initial={settings?.wallpaper || null} />

      <div className="mt-12 pt-8 border-t border-line">
        <h2 className="font-display font-bold text-xl text-ink mb-2">Tapeta mobilní appky</h2>
        <p className="text-muted mb-8">
          Samostatný obrázek jen pro uvítací obrazovku mobilní appky — nezávislý na tapetě webu výše.
        </p>
        <MobileWallpaperForm initial={settings?.mobileWallpaper || null} />
      </div>

      <div className="mt-12 pt-8 border-t border-line">
        <h2 className="font-display font-bold text-xl text-ink mb-2">Logo mobilní appky</h2>
        <p className="text-muted mb-8">
          Zobrazí se na uvítací obrazovce appky po přihlášení. Bez nahraného loga se zobrazí jednoduchý kruh s písmenem.
        </p>
        <MobileLogoForm initial={settings?.mobileLogo || null} />
      </div>

      <div className="mt-12 pt-8 border-t border-line">
        <h2 className="font-display font-bold text-xl text-ink mb-2">Aplikácia a sociálne siete</h2>
        <p className="text-muted mb-8">
          Zobrazí se na hlavní stránce pod žebříčky. Prázdná pole se jednoduše nezobrazí.
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
          Text, který se zobrazí v modálním okně, když někdo klikne na "Nastavení soukromí" v patičce hlavní stránky.
        </p>
        <PrivacyModalTextForm initialText={settings?.privacyModalText || null} initialCategories={settings?.privacyCategories || null} />
      </div>

      <div className="mt-12 pt-8 border-t border-line">
        <h2 className="font-display font-bold text-xl text-ink mb-2">Stránka Cookies</h2>
        <p className="text-muted mb-8">
          Text, který se zobrazí na stránce /cookies, když někdo klikne na "Cookies" v patičce hlavní stránky.
        </p>
        <CookiesPolicyForm initial={settings?.cookiesPolicyText || null} />
      </div>
    </div>
  );
}
