import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { IconUser } from '@/components/Icons';
import MessageForm from '@/components/MessageForm';
import MessageImageReveal from '@/components/MessageImageReveal';
import ConversationConsentBanner from '@/components/ConversationConsentBanner';
import { sortedPair } from '@/lib/conversation';

export const dynamic = 'force-dynamic';

export default async function ConversationPage({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const myId = (session.user as any).id;

  const other = await prisma.user.findUnique({ where: { id: params.userId }, select: { id: true, name: true, avatar: true } });
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

  return (
    <div className="pt-8 flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center gap-3 pb-4 border-b border-line">
        <Link href="/messages" className="text-muted hover:text-accent">←</Link>
        <Link href={`/profile/${other.id}`} className="flex items-center gap-3">
          {other.avatar ? (
            <img src={other.avatar} alt={other.name} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center">
              <IconUser className="w-4 h-4 text-muted" />
            </div>
          )}
          <span className="font-display font-bold text-ink">{other.name}</span>
        </Link>
      </div>

      <div
        className="flex-1 overflow-y-auto py-5 space-y-2 px-1 sm:px-3"
        style={{
          backgroundImage:
            'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.035) 1px, transparent 0)',
          backgroundSize: '18px 18px'
        }}
      >
        {isPendingForMe && <ConversationConsentBanner otherId={other.id} otherName={other.name} />}

        {messages.length === 0 ? (
          <p className="text-muted text-sm text-center">Zatiaľ žiadne správy. Napíš prvú.</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === myId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm ${
                    mine ? 'bg-accent text-white rounded-br-sm' : 'bg-card text-ink rounded-bl-sm border border-line'
                  }`}
                >
                  {m.image && <MessageImageReveal messageId={m.id} mine={mine} alreadyViewed={!!m.imageViewedAt} />}
                  {m.body && <p className="text-sm whitespace-pre-wrap leading-snug">{m.body}</p>}
                  <div className={`text-[10px] mt-1 text-right ${mine ? 'text-white/70' : 'text-muted'}`}>
                    {new Date(m.createdAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <MessageForm receiverId={other.id} disabledReason={disabledReason} />
    </div>
  );
}
