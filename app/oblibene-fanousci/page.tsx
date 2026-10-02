import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFanFavorites } from '@/lib/fanFavorites';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import FanFavoritesSection from '@/components/FanFavoritesSection';

export const dynamic = 'force-dynamic';

// Kompletný zoznam „Oblíbené mezi fanoušky“ (otvára sa šípkou pri nadpise
// na hlavnej stránke). Prepínač Vše / Filmy / Seriály.
export default async function FanFavoritesPage(props: { searchParams: Promise<{ typ?: string }> }) {
  const sp = await props.searchParams;
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id as string | undefined;
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string, fallback: string) => dict[key] || fallback;

  const typ = sp?.typ === 'filmy' ? 'filmy' : sp?.typ === 'serialy' ? 'serialy' : 'vse';
  const { items, updatedAt } = await getFanFavorites(viewerId);
  const shown = items.filter((m) => (typ === 'filmy' ? m.contentType !== 'Seriál' : typ === 'serialy' ? m.contentType === 'Seriál' : true));

  const tabs = [
    { key: 'vse', href: '/oblibene-fanousci', label: t('fans.vsetko', 'Vše') },
    { key: 'filmy', href: '/oblibene-fanousci?typ=filmy', label: t('fans.filmy', 'Filmy') },
    { key: 'serialy', href: '/oblibene-fanousci?typ=serialy', label: t('fans.serialy', 'Seriály') }
  ];

  return (
    <div className="pt-6 pb-12">
      <Link href="/" className="text-xs font-semibold text-accent hover:underline">‹ {t('fans.spat', 'Hlavní stránka')}</Link>
      <h1 className="font-display font-extrabold text-3xl text-ink mt-2">{t('home.oblubene_fanusikovia', 'Oblíbené mezi fanoušky')}</h1>
      <p className="text-muted text-sm mt-1">
        {t('home.oblubene_popis', 'Co tento týden nejvíc zajímá diváky')}
        {updatedAt && (
          <>
            {' · '}
            {t('fans.aktualizovane', 'Aktualizováno')} {new Date(updatedAt).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </>
        )}
      </p>

      <div className="flex gap-2 mt-5 mb-6">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors ${
              typ === tab.key ? 'bg-night text-white border-night' : 'text-muted border-line hover:border-night hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="border border-line rounded-xl p-8 text-center text-muted bg-surface">{t('fans.prazdne', 'Zatím tu nic není.')}</div>
      ) : (
        <FanFavoritesSection key={typ} initialItems={shown} layout="grid" />
      )}
    </div>
  );
}
