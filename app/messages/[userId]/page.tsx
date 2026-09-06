import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { IconUser } from '@/components/Icons';
import MessageForm from '@/components/MessageForm';
import MessageImageReveal from '@/components/MessageImageReveal';
import ConversationConsentBanner from '@/components/ConversationConsentBanner';
import ChatAutoScroll from '@/components/ChatAutoScroll';
import ChatHeaderActions from '@/components/ChatHeaderActions';
import { sortedPair } from '@/lib/conversation';
import { formatPresence, isOnline } from '@/lib/presence';

export const dynamic = 'force-dynamic';

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'DNES';
  if (date.toDateString() === yesterday.toDateString()) return 'VČERA';
  return date.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function ConversationPage({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const myId = (session.user as any).id;
  await prisma.user.update({ where: { id: myId }, data: { lastActiveAt: new Date() } }).catch(() => {});

  const other = await prisma.user.findUnique({ where: { id: params.userId }, select: { id: true, name: true, avatar: true, lastActiveAt: true } });
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
    orderBy: { createdAt: 'asc' }
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

  // Zoskupenie správ podľa dňa, na vloženie dátumových oddeľovačov medzi ne.
  let lastDay = '';

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

      <div className="flex-1 overflow-y-auto py-5 space-y-1">
        {isPendingForMe && <ConversationConsentBanner otherId={other.id} otherName={other.name} />}

        {messages.length === 0 ? (
          <p className="text-muted text-sm text-center">Zatiaľ žiadne správy. Napíš prvú.</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === myId;
            const thisDay = dayLabel(m.createdAt);
            const showDivider = thisDay !== lastDay;
            lastDay = thisDay;

            return (
              <div key={m.id}>
                {showDivider && (
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] font-semibold text-muted bg-surface px-3 py-1 rounded-full">{thisDay}</span>
                  </div>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${mine ? 'bg-accent text-white' : 'bg-surface text-ink'}`}>
                    {m.image && <MessageImageReveal messageId={m.id} mine={mine} alreadyViewed={!!m.imageViewedAt} />}
                    {m.body && <p className="text-sm whitespace-pre-wrap leading-snug">{m.body}</p>}
                    <div className={`flex items-center justify-end gap-1 mt-1 ${mine ? 'text-white/70' : 'text-muted'}`}>
                      <span className="text-[10px]">
                        {new Date(m.createdAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {mine && <span className={`text-[11px] ${m.read ? 'text-white' : 'text-white/60'}`}>✓✓</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <ChatAutoScroll dep={messages.length} />
      </div>

      <MessageForm receiverId={other.id} disabledReason={disabledReason} />
    </div>
  );
}
