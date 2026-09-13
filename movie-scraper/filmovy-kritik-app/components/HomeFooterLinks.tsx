import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import { DEFAULT_PRIVACY_TEXT, DEFAULT_PRIVACY_CATEGORIES } from '@/lib/privacyDefaults';
import SignOutButton from './SignOutButton';
import PrivacyModal from './PrivacyModal';

// Zvyšok odkazov (okrem Odhlásiť sa a Nastavenia súkromia) sú zatiaľ len
// pripravené miesta — samotné stránky sa doplnia neskôr.
const PLACEHOLDER_KEYS_AFTER = ['footer.pracuj_s_nami', 'footer.prevadzkovatel', 'footer.reklama'];

export default async function HomeFooterLinks() {
  const session = await getServerSession(authOptions);
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;
  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });

  let categories = DEFAULT_PRIVACY_CATEGORIES;
  if (settings?.privacyCategories) {
    try {
      const parsed = JSON.parse(settings.privacyCategories);
      if (Array.isArray(parsed) && parsed.length > 0) {
        categories = parsed.map((c: any, i: number) => ({ ...c, key: c.key || `custom-${i}` }));
      }
    } catch {}
  }

  return (
    <div className="mt-6 pt-5 border-t border-line">
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-xs text-center">
        {session && (
          <>
            <SignOutButton className="text-accent hover:underline font-medium" label={t('panel.odhlasit')} />
            <span className="text-line">·</span>
          </>
        )}

        <Link href="/navod-na-pouzitie" className="text-accent hover:underline font-medium">
          {t('footer.navod')}
        </Link>
        <span className="text-line">·</span>

        <PrivacyModal text={settings?.privacyModalText || DEFAULT_PRIVACY_TEXT} categories={categories} trigger={t('footer.nastavenie_sukromia')} />
        <span className="text-line">·</span>

        <Link href="/napis-nam" className="text-accent hover:underline font-medium">
          {t('footer.napis_nam')}
        </Link>
        <span className="text-line">·</span>

        {PLACEHOLDER_KEYS_AFTER.map((key) => (
          <span key={key} className="flex items-center gap-x-2.5">
            <span className="text-accent hover:underline font-medium cursor-default">{t(key)}</span>
            <span className="text-line">·</span>
          </span>
        ))}

        <Link href="/pravidla" className="text-accent hover:underline font-medium">
          {t('footer.pravidla')}
        </Link>
        <span className="text-line">·</span>

        <Link href="/zasady-ochrany-udajov" className="text-accent hover:underline font-medium">
          {t('footer.zasady_udajov')}
        </Link>
        <span className="text-line">·</span>

        <Link href="/cookies" className="text-accent hover:underline font-medium">
          {t('footer.cookies')}
        </Link>
      </div>
    </div>
  );
}
