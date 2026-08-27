import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { IconUser } from '@/components/Icons';
import MessageForm from '@/components/MessageForm';

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

      <div className="flex-1 overflow-y-auto py-5 space-y-3">
        {messages.length === 0 ? (
          <p className="text-muted text-sm text-center">Zatiaľ žiadne správy. Napíš prvú.</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === myId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${mine ? 'bg-accent text-white' : 'bg-surface text-ink'}`}>
                  {m.image && <img src={m.image} alt="Príloha" className="rounded-xl mb-1.5 max-h-64" />}
                  {m.body && <p className="text-sm whitespace-pre-wrap">{m.body}</p>}
                  <div className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-muted'}`}>
                    {new Date(m.createdAt).toLocaleString('sk-SK')}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <MessageForm receiverId={other.id} />
    </div>
  );
}
