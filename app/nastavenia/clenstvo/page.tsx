import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SettingsTabs from '@/components/SettingsTabs';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function MembershipSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { membershipUntil: true }
  });

  const until = user?.membershipUntil;
  const isActive = !!(until && until > new Date());

  return (
    <div className="pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{t('settings.nadpis')}</h1>
      <SettingsTabs />

      <div className="max-w-xl border border-line rounded-xl p-5 mt-6">
        <div className="flex items-center gap-3 mb-3">
          <img src="/golden-ticket-badge.svg" alt="" width={32} height={32} className="flex-none" />
          <h2 className="font-display font-bold text-lg text-ink">{t('membership.golden_ticket')}</h2>
        </div>

        {isActive ? (
          <p className="text-sm text-ink">
            {t('membership.aktivne_do')} <strong>{until!.toLocaleDateString('sk-SK')}</strong>.
          </p>
        ) : (
          <p className="text-sm text-ink">{t('membership.nemas_aktivne')}</p>
        )}

        <p className="text-xs text-muted mt-3">{t('membership.info_text')}</p>
      </div>
    </div>
  );
}
