import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsTabs from '@/components/SettingsTabs';
import TwoFactorSettings from '@/components/TwoFactorSettings';

export const dynamic = 'force-dynamic';

export default async function SecuritySettingsPage(props: { searchParams: Promise<{ vyzadovano?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Nastavení</h1>
      <SettingsTabs />
      <TwoFactorSettings requiredNotice={searchParams.vyzadovano === '1' || !!(session.user as any)?.needsTwoFactorSetup} />
    </div>
  );
}
