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
import ChatPolling from '@/components/ChatPolling';
import ChatTypingIndicator from '@/components/ChatTypingIndicator';
import { sortedPair } from '@/lib/conversation';
import { formatPresence, isOnline } from '@/lib/presence';
import { tryDecryptMessageBody } from '@/lib/serverCrypto';
import { VOICE_SELECT, cleanupIfAnyExpired, voiceView } from '@/lib/voiceMessages';
import { PHOTO_SELECT, photoCleanupIfAnyExpired, photoView } from '@/lib/photoMessages';

export const dynamic = 'force-dynamic';

export default async function ConversationPage(props: { params: Promise<{ userId: string }> }) {
  const { params } = { ...props, params: await props.params };
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const myId = (session.user as any).id;
  await prisma.user.update({ where: { id: myId }, data: { lastActiveAt: new Date() } }).catch(() => {});

  const other = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, avatar: true, lastActiveAt: true }
  });
  if (!other) return notFound();

  const iBlockedThem = await prisma.blockedUser.findUnique({
    where: { blockerId_blockedId: { blockerId: myId, blockedId: other.id } }
  });

  await prisma.message.updateMany({
    where: { senderId: other.id, receiverId: myId, read: false },
    data: { read: true }
  });

  const myDeletion = await prisma.conversationDeletion.findUnique({
    where: { userId_otherId: { userId: myId, otherId: other.id } }
  });

  const rawMessages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: myId, receiverId: other.id },
        { senderId: other.id, receiverId: myId }
      ],
      ...(myDeletion ? { createdAt: { gt: myDeletion.deletedAt } } : {})
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, senderId: true, receiverId: true, body: true, iv: true, image: true, imageViewedAt: true, read: true, createdAt: true, ...VOICE_SELECT, ...PHOTO_SELECT }
  });
  cleanupIfAnyExpired(rawMessages);
  photoCleanupIfAnyExpired(rawMessages);

  // Fotky platia 24 h od odoslania (potom ich zmaže upratovanie).
  // Dešifrovanie prebieha tu, na serveri — jednoducho a spoľahlivo, bez ohľadu
  // na to, aké zariadenie si používateľ práve otvoril.
  // Do prehliadača ide len to, čo treba — Cloudinary ID hlasovky nikdy nie.
  const nowMs = Date.now();
  const messages = rawMessages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    receiverId: m.receiverId,
    ...photoView(m, nowMs),
    imageViewedAt: m.imageViewedAt,
    read: m.read,
    createdAt: m.createdAt,
    body: m.voice ? null : m.body && m.iv ? tryDecryptMessageBody(m.body, m.iv) : m.body,
    voice: voiceView(m, nowMs)
  }));

  const [userAId, userBId] = sortedPair(myId, other.id);
  const conversation = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });

  const isPendingForMe = conversation?.status === 'PENDING' && conversation.initiatorId !== myId;
  const isPendingWaiting = conversation?.status === 'PENDING' && conversation.initiatorId === myId && messages.length > 0;
  const isDeclined = conversation?.status === 'DECLINED';

  let disabledReason: string | null = null;
  if (iBlockedThem) disabledReason = `Zablokoval/-a sis uživatele ${other.name}. Přes "⋮" nahoře ho/ji můžeš odblokovat.`;
  else if (isDeclined) disabledReason = `${other.name} odmietol/-la s tebou komunikovať.`;
  else if (isPendingForMe) disabledReason = 'Najprv rozhodni o žiadosti o komunikáciu vyššie.';
  else if (isPendingWaiting) disabledReason = 'Čakáš, kým druhá strana potvrdí, že s tebou chce komunikovať.';

  return (
    <div className="pt-8 flex flex-col h-[calc(100vh-140px)]">
      <ChatPolling otherId={other.id} />
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

      <div
        className="flex-1 overflow-y-auto py-5 space-y-1"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(128,128,128,0.18) 1px, transparent 0)',
          backgroundSize: '18px 18px'
        }}
      >
        {isPendingForMe && <ConversationConsentBanner otherId={other.id} otherName={other.name} />}
        <ChatMessageList messages={messages} myId={myId} otherId={other.id} />
        <ChatTypingIndicator otherId={other.id} />
      </div>

      <MessageForm receiverId={other.id} disabledReason={disabledReason} />
    </div>
  );
}
