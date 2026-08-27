import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsTabs from '@/components/SettingsTabs';

export const dynamic = 'force-dynamic';

export default async function ConnectionsSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Nastavenia</h1>
      <SettingsTabs />
      <div className="max-w-md border border-line rounded-xl bg-surface p-5">
        <p className="text-sm text-muted leading-relaxed">
          PunisherEDNA reviews sa momentálne prihlasuje len cez prezývku a heslo — prepojenie s Googlom, Facebookom
          a podobnými účtami zatiaľ nepodporujeme. Ak by si o túto možnosť mal záujem, napíš nám o tom cez{' '}
          <a href="/napis-nam" className="text-accent font-semibold hover:underline">kontaktný formulár</a>.
        </p>
      </div>
    </div>
  );
}
