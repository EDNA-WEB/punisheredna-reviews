import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsTabs from '@/components/SettingsTabs';

export const dynamic = 'force-dynamic';

export default async function DevicesSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Nastavenia</h1>
      <SettingsTabs />
      <div className="max-w-md border border-line rounded-xl bg-surface p-5">
        <p className="text-sm text-muted leading-relaxed mb-3">
          Prehľad a správa jednotlivých prihlásených zariadení/prehliadačov tu zatiaľ nie je k dispozícii.
        </p>
        <p className="text-sm text-muted leading-relaxed">
          Ak si myslíš, že sa niekto iný prihlásil na tvoj účet, najjednoduchšie riešenie je hneď si{' '}
          <a href="/nastavenia/heslo" className="text-accent font-semibold hover:underline">zmeniť heslo</a>.
        </p>
      </div>
    </div>
  );
}
