import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SettingsTabs from '@/components/SettingsTabs';

export const dynamic = 'force-dynamic';

export default async function MembershipSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { membershipUntil: true }
  });

  const until = user?.membershipUntil;
  const isActive = !!(until && until > new Date());

  return (
    <div className="pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Nastavenia</h1>
      <SettingsTabs />

      <div className="max-w-xl border border-line rounded-xl p-5 mt-6">
        <div className="flex items-center gap-3 mb-3">
          <img src="/golden-ticket-badge.svg" alt="" width={32} height={32} className="flex-none" />
          <h2 className="font-display font-bold text-lg text-ink">Golden Ticket členstvo</h2>
        </div>

        {isActive ? (
          <p className="text-sm text-ink">
            Tvoje členstvo je <strong className="text-emerald-600">aktívne</strong> do{' '}
            <strong>{until!.toLocaleDateString('sk-SK')}</strong>.
          </p>
        ) : (
          <p className="text-sm text-ink">
            Momentálne <strong>nemáš aktívne</strong> Golden Ticket členstvo.
          </p>
        )}

        <p className="text-xs text-muted mt-3">
          Členstvo sa nastavuje ručne po prijatí platby — ak si už zaplatil a členstvo sa tu ešte nezobrazuje, daj nám
          prosím vedieť.
        </p>
      </div>
    </div>
  );
}
