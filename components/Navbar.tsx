import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role || null;
  const userName = session?.user?.name || null;
  const userId = (session?.user as any)?.id || null;

  let avatar: string | null = null;
  let unreadMessages = 0;
  if (userId) {
    const [user, unread] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } }),
      prisma.message.count({ where: { receiverId: userId, read: false } })
    ]);
    avatar = user?.avatar || null;
    unreadMessages = unread;
  }

  return (
    <NavbarClient
      role={role}
      userName={userName}
      userId={userId}
      userAvatar={avatar}
      isLoggedIn={!!session}
      unreadMessages={unreadMessages}
    />
  );
}
