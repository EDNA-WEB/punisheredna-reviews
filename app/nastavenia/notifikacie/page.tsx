import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsTabs from '@/components/SettingsTabs';

export const dynamic = 'force-dynamic';

export default async function NotificationSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Nastavenia</h1>
      <SettingsTabs />
      <div className="max-w-md border border-line rounded-xl bg-surface p-5">
        <p className="text-sm text-muted leading-relaxed">
          Notifikácie (zvonček v navbare) sú aktívne pre všetkých automaticky — odpovede na komentáre, nové sledovanie a
          podobne. Podrobné nastavenie, ktoré typy notifikácií chceš dostávať, tu zatiaľ nie je k dispozícii — pridáme ho
          v budúcnosti.
        </p>
      </div>
    </div>
  );
}
