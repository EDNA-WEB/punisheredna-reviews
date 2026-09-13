import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SettingsTabs from '@/components/SettingsTabs';
import AccountSettingsForm from '@/components/AccountSettingsForm';
import DeleteAccountSection from '@/components/DeleteAccountSection';

export const dynamic = 'force-dynamic';

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
  if (!user) redirect('/login');

  return (
    <div className="pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Nastavenia</h1>
      <SettingsTabs />
      <AccountSettingsForm
        initial={{
          name: user.name,
          bio: user.bio || '',
          firstName: user.firstName,
          lastName: user.lastName,
          gender: user.gender,
          birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
          tagline: user.tagline,
          email: user.email,
          hideEmail: user.hideEmail,
          homepage: user.homepage,
          facebookUrl: user.facebookUrl,
          instagramUrl: user.instagramUrl,
          tiktokUrl: user.tiktokUrl,
          xUrl: user.xUrl,
          youtubeUrl: user.youtubeUrl,
          spotifyUrl: user.spotifyUrl,
          linkedinUrl: user.linkedinUrl,
          snapchatUrl: user.snapchatUrl,
          blueskyUrl: user.blueskyUrl,
          country: user.country,
          region: user.region
        }}
      />
      <DeleteAccountSection />
    </div>
  );
}
