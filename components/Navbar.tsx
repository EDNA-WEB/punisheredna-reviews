import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role || null;
  const isEditor = (session?.user as any)?.isEditor || false;
  const userName = session?.user?.name || null;
  const userId = (session?.user as any)?.id || null;

  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' }, select: { buyMeACoffeeUrl: true } });

  let avatar: string | null = null;
  let unreadMessages = 0;
  let hasActiveMembership = false;
  if (userId) {
    const [user, unread] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { avatar: true, membershipUntil: true } }),
      prisma.message.count({ where: { receiverId: userId, read: false } })
    ]);
    avatar = user?.avatar || null;
    unreadMessages = unread;
    hasActiveMembership = !!(user?.membershipUntil && user.membershipUntil > new Date());
  }

  return (
    <NavbarClient
      role={role}
      isEditor={isEditor}
      userName={userName}
      userId={userId}
      userAvatar={avatar}
      isLoggedIn={!!session}
      unreadMessages={unreadMessages}
      buyMeACoffeeUrl={hasActiveMembership ? null : settings?.buyMeACoffeeUrl || null}
    />
  );
}
