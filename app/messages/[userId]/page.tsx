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
  if (isDeclined) disabledReason = `${other.name} odmietol/-la s tebou komunikovať.`;
  else if (isPendingForMe) disabledReason = 'Najprv rozhodni o žiadosti o komunikáciu vyššie.';
  else if (isPendingWaiting) disabledReason = 'Čakáš, kým druhá strana potvrdí, že s tebou chce komunikovať.';

  // Zoskupenie správ podľa dňa, na vloženie dátumových oddeľovačov medzi ne.
  let lastDay = '';

  return (
    <div className="pt-8">
      <div className="rounded-xl overflow-hidden shadow-lg flex flex-col h-[calc(100vh-160px)]" style={{ backgroundColor: '#0b141a' }}>
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ backgroundColor: '#202c33' }}>
          <Link href="/messages" className="text-[#aebac1] hover:text-white">←</Link>
          <Link href={`/profile/${other.id}`} className="flex items-center gap-3 flex-1 min-w-0">
            {other.avatar ? (
              <img src={other.avatar} alt={other.name} className="w-10 h-10 rounded-full object-cover flex-none" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center flex-none">
                <IconUser className="w-4 h-4 text-[#8696a0]" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-medium text-[#e9edef] text-[16px] truncate">{other.name}</div>
              <div className={`text-[13px] truncate ${isOnline(other.lastActiveAt) ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>
                {formatPresence(other.lastActiveAt)}
              </div>
            </div>
          </Link>
          <ChatHeaderActions />
        </div>

        <div
          className="flex-1 overflow-y-auto py-5 px-3 sm:px-8"
          style={{
            backgroundColor: '#0b141a',
            backgroundImage: 'radial-gradient(circle at 3px 3px, rgba(255,255,255,0.035) 1.5px, transparent 0)',
            backgroundSize: '22px 22px'
          }}
        >
          {isPendingForMe && <ConversationConsentBanner otherId={other.id} otherName={other.name} />}

          {messages.length === 0 ? (
            <p className="text-[#8696a0] text-sm text-center">Zatiaľ žiadne správy. Napíš prvú.</p>
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
                      <span className="text-[12px] font-medium text-[#e9edef] px-3 py-1 rounded-lg" style={{ backgroundColor: '#182229' }}>
                        {thisDay}
                      </span>
                    </div>
                  )}
                  <div className={`flex mb-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`relative max-w-[78%] sm:max-w-[65%] rounded-lg px-2.5 py-1.5 shadow-sm ${mine ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                      style={{ backgroundColor: mine ? '#005c4b' : '#202c33' }}
                    >
                      {/* Chvostík bubliny */}
                      <span
                        className="absolute top-0 w-0 h-0"
                        style={
                          mine
                            ? { right: '-8px', borderTop: '8px solid #005c4b', borderRight: '8px solid transparent' }
                            : { left: '-8px', borderTop: '8px solid #202c33', borderLeft: '8px solid transparent' }
                        }
                      />
                      {m.image && <MessageImageReveal messageId={m.id} mine={mine} alreadyViewed={!!m.imageViewedAt} />}
                      {m.body && <p className="text-[14.5px] text-[#e9edef] whitespace-pre-wrap leading-snug">{m.body}</p>}
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[11px] text-[#8696a0]">
                          {new Date(m.createdAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {mine && (
                          <span className={`text-[13px] leading-none ${m.read ? 'text-[#53bdeb]' : 'text-[#8696a0]'}`}>✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <ChatAutoScroll dep={messages.length} />
        </div>

        <div className="px-3 sm:px-4 py-2.5" style={{ backgroundColor: '#202c33' }}>
          <MessageForm receiverId={other.id} disabledReason={disabledReason} dark />
        </div>
      </div>
    </div>
  );
}
