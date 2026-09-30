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
          Přehled a správa jednotlivých přihlášených zařízení/prohlížečů tu zatím není k dispozici.
        </p>
        <p className="text-sm text-muted leading-relaxed">
          Pokud si myslíš, že se někdo jiný přihlásil k tvému účtu, nejjednodušší řešení je hned si{' '}
          <a href="/nastavenia/heslo" className="text-accent font-semibold hover:underline">změnit heslo</a>.
        </p>
      </div>
    </div>
  );
}
