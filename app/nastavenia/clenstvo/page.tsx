import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SettingsTabs from '@/components/SettingsTabs';
import MembershipRedeemForm from '@/components/MembershipRedeemForm';

export const dynamic = 'force-dynamic';

export default async function MembershipSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { membershipUntil: true }
  });

  return (
    <div className="pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Nastavenia</h1>
      <SettingsTabs />
      <MembershipRedeemForm membershipUntil={user?.membershipUntil ? user.membershipUntil.toISOString() : null} />
    </div>
  );
}
