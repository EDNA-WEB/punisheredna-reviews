import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { IconUser } from '@/components/Icons';
import MessageForm from '@/components/MessageForm';
import ChatMessageList from '@/components/ChatMessageList';
import ConversationConsentBanner from '@/components/ConversationConsentBanner';
import ChatHeaderActions from '@/components/ChatHeaderActions';
import ChatThemeWrapper from '@/components/ChatThemeWrapper';
import { sortedPair } from '@/lib/conversation';
import { formatPresence, isOnline } from '@/lib/presence';

export const dynamic = 'force-dynamic';

export default async function ConversationPage({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const myId = (session.user as any).id;
  await prisma.user.update({ where: { id: myId }, data: { lastActiveAt: new Date() } }).catch(() => {});

  const other = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, avatar: true, lastActiveAt: true, publicKey: true }
  });
  if (!other) return notFound();

  const iBlockedThem = await prisma.blockedUser.findUnique({
    where: { blockerId_blockedId: { blockerId: myId, blockedId: other.id } }
  });

  await prisma.message.updateMany({
    where: { senderId: other.id, receiverId: myId, read: false },
    data: { read: true }
  });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: myId, receiverId: other.id },
        { senderId: other.id, receiverId: myId }
      ]
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, senderId: true, body: true, iv: true, image: true, imageViewedAt: true, read: true, createdAt: true }
  });

  const [userAId, userBId] = sortedPair(myId, other.id);
  const conversation = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });

  const isPendingForMe = conversation?.status === 'PENDING' && conversation.initiatorId !== myId;
  const isPendingWaiting = conversation?.status === 'PENDING' && conversation.initiatorId === myId && messages.length > 0;
  const isDeclined = conversation?.status === 'DECLINED';

  let disabledReason: string | null = null;
  if (iBlockedThem) disabledReason = `Zablokoval/-a si ${other.name}. Cez "⋮" hore ho/ju môžeš odblokovať.`;
  else if (isDeclined) disabledReason = `${other.name} odmietol/-la s tebou komunikovať.`;
  else if (isPendingForMe) disabledReason = 'Najprv rozhodni o žiadosti o komunikáciu vyššie.';
  else if (isPendingWaiting) disabledReason = 'Čakáš, kým druhá strana potvrdí, že s tebou chce komunikovať.';

  return (
    <div className="pt-8 flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center gap-3 pb-4 border-b border-line">
        <Link href="/messages" className="text-muted hover:text-accent">←</Link>
        <Link href={`/profile/${other.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          {other.avatar ? (
            <img src={other.avatar} alt={other.name} className="w-9 h-9 rounded-full object-cover flex-none" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center flex-none">
              <IconUser className="w-4 h-4 text-muted" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-display font-bold text-ink truncate">{other.name}</div>
            <div className={`text-xs truncate ${isOnline(other.lastActiveAt) ? 'text-accent font-medium' : 'text-muted'}`}>
              {formatPresence(other.lastActiveAt)}
            </div>
          </div>
        </Link>
        <ChatHeaderActions otherId={other.id} otherName={other.name} initiallyBlocked={!!iBlockedThem} />
      </div>

      <ChatThemeWrapper otherId={other.id}>
        {isPendingForMe && <ConversationConsentBanner otherId={other.id} otherName={other.name} />}
        <ChatMessageList messages={messages} myId={myId} otherId={other.id} otherPublicKey={other.publicKey} />
      </ChatThemeWrapper>

      <MessageForm receiverId={other.id} receiverPublicKey={other.publicKey} disabledReason={disabledReason} />
    </div>
  );
}
