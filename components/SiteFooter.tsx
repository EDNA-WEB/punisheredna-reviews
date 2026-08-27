import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AppAndSocialSection from './AppAndSocialSection';
import TimezoneLanguageBar from './TimezoneLanguageBar';
import HomeFooterLinks from './HomeFooterLinks';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

const FOUNDING_YEAR = 2026;
const CURRENT_YEAR = new Date().getFullYear();

export default async function SiteFooter() {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const dict = await getDictionary(await getUserLanguage());

  const [settings, viewerUser] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 'singleton' } }),
    viewerId ? prisma.user.findUnique({ where: { id: viewerId }, select: { timezone: true } }) : null
  ]);

  return (
    <div className="mt-10">
      <AppAndSocialSection
        appStoreUrl={settings?.appStoreUrl || null}
        googlePlayUrl={settings?.googlePlayUrl || null}
        facebookUrl={settings?.facebookUrl || null}
        instagramUrl={settings?.instagramUrl || null}
        tiktokUrl={settings?.tiktokUrl || null}
        youtubeUrl={settings?.youtubeUrl || null}
      />

      <TimezoneLanguageBar savedTimezone={viewerUser?.timezone || null} />

      <HomeFooterLinks />

      <div className="mt-5 pt-4 border-t border-line text-center">
        <p className="text-[11px] text-muted">
          PunisherEDNA reviews © {FOUNDING_YEAR === CURRENT_YEAR ? FOUNDING_YEAR : `${FOUNDING_YEAR}-${CURRENT_YEAR}`} PunisherEDNA s.r.o.{' '}
          <span className="text-line">·</span> {dict['footer.vsetky_prava']}
        </p>
      </div>
    </div>
  );
}
