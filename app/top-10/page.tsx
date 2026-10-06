import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTop10 } from '@/lib/top10';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import Top10Section from '@/components/Top10Section';

export const dynamic = 'force-dynamic';

// Celý rebríček „Top 10 tento týden“ (šípka pri nadpise na hlavnej stránke).
export default async function Top10Page() {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id as string | undefined;
  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;
  const { items, updatedAt } = await getTop10(viewerId);

  return (
    <div className="pt-6 pb-12">
      <Link href="/" className="text-xs font-semibold text-accent hover:underline">‹ {t('fans.spat', 'Hlavní stránka')}</Link>
      <h1 className="font-display font-extrabold text-3xl text-ink mt-2 flex items-center gap-3">
        <span className="w-1.5 h-8 rounded-full bg-[#f5c518]" aria-hidden="true" />
        {t('top10.nadpis', 'Top 10 tento týden')}
      </h1>
      <p className="text-muted text-sm mt-1 mb-6">
        {t('top10.popis', 'Co tento týden nejvíc sledují diváci')}
        {updatedAt ? ` · ${t('fans.aktualizovane', 'Aktualizováno')} ${new Date(updatedAt).toLocaleDateString('cs-CZ')}` : ''}
      </p>
      {items.length ? (
        <Top10Section initialItems={items} layout="list" />
      ) : (
        <div className="border border-line rounded-xl p-8 text-center text-muted bg-surface">{t('fans.prazdne', 'Zatím tu nic není.')}</div>
      )}
    </div>
  );
}
