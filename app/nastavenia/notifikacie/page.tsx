import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsTabs from '@/components/SettingsTabs';
import EmailPreferencesForm from '@/components/email/EmailPreferencesForm';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function NotificationSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;

  return (
    <div className="pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{t('emailpref.nastavenia', 'Nastavení')}</h1>
      <SettingsTabs />
      <EmailPreferencesForm />
      <p className="max-w-xl text-sm text-muted leading-relaxed mt-8">
        {t('emailpref.zvoncek', 'Oznámení na webu (zvoneček v navigaci) jsou aktivní automaticky — odpovědi na komentáře, nové sledování a podobně.')}
      </p>
    </div>
  );
}
