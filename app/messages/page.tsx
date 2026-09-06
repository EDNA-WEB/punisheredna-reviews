import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { IconUser, IconMessage } from '@/components/Icons';
import NewMessageSearch from '@/components/NewMessageSearch';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const myId = (session.user as any).id;

  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: myId }, { receiverId: myId }] },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
      receiver: { select: { id: true, name: true, avatar: true } }
    }
  });

  const conversationRows = await prisma.conversation.findMany({
    where: { OR: [{ userAId: myId }, { userBId: myId }] }
  });
  const statusByOtherId = new Map<string, { status: string; initiatorId: string }>();
  for (const c of conversationRows) {
    const otherId = c.userAId === myId ? c.userBId : c.userAId;
    statusByOtherId.set(otherId, { status: c.status, initiatorId: c.initiatorId });
  }

  const conversations = new Map<string, { user: any; lastText: string; lastAt: Date; unread: number; lastMine: boolean }>();
  for (const m of messages) {
    const other = m.senderId === myId ? m.receiver : m.sender;
    if (!conversations.has(other.id)) {
      conversations.set(other.id, {
        user: other,
        lastText: m.body || (m.image ? '📷 Fotka' : ''),
        lastAt: m.createdAt,
        unread: 0,
        lastMine: m.senderId === myId
      });
    }
    if (m.receiverId === myId && !m.read) {
      conversations.get(other.id)!.unread += 1;
    }
  }

  const list = Array.from(conversations.values());

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-6">Pošta</h1>

      <div className="grid md:grid-cols-[360px_1fr] rounded-xl overflow-hidden min-h-[560px] shadow-lg" style={{ backgroundColor: '#111b21' }}>
        <div className="border-r border-black/30 flex flex-col">
          <div className="p-3 border-b border-black/20">
            <NewMessageSearch dark />
          </div>

          <div className="flex-1 overflow-y-auto">
            {list.length === 0 ? (
              <div className="text-sm text-[#8696a0] text-center py-10 px-4">
                Zatiaľ nemáš žiadne konverzácie. Nájdi si niekoho vyššie a napíš mu.
              </div>
            ) : (
              list.map((c) => (
                <Link
                  key={c.user.id}
                  href={`/messages/${c.user.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-black/10 hover:bg-[#202c33] transition-colors"
                >
                  {c.user.avatar ? (
                    <img src={c.user.avatar} alt={c.user.name} className="w-12 h-12 rounded-full object-cover flex-none" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#2a3942] flex items-center justify-center flex-none">
                      <IconUser className="w-5 h-5 text-[#8696a0]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#e9edef] text-[15px] truncate">{c.user.name}</span>
                      <span className="text-[11px] text-[#8696a0] flex-none">
                        {new Date(c.lastAt).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#8696a0] truncate mt-0.5">
                      {(() => {
                        const st = statusByOtherId.get(c.user.id);
                        if (st?.status === 'DECLINED') return <span className="text-[#f15c6d]">Zamietnuté</span>;
                        if (st?.status === 'PENDING' && st.initiatorId === myId) return <span className="text-[#ffb454]">Čaká na potvrdenie</span>;
                        if (st?.status === 'PENDING') return <span className="text-[#00a884] font-medium">Chce s tebou komunikovať</span>;
                        return (
                          <>
                            {c.lastMine && <span className="mr-1">✓✓</span>}
                            {c.lastText}
                          </>
                        );
                      })()}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="w-5 h-5 bg-[#00a884] text-white text-[11px] font-bold rounded-full flex items-center justify-center flex-none">
                      {c.unread}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        <div
          className="hidden md:flex flex-col items-center justify-center text-center p-10"
          style={{ backgroundColor: '#0b141a' }}
        >
          <IconMessage className="w-12 h-12 text-[#364147] mb-3" />
          <p className="text-sm text-[#8696a0] max-w-xs">
            Vyber konverzáciu zo zoznamu vľavo, alebo si vyhľadaj niekoho a napíš mu.
          </p>
        </div>
      </div>
    </div>
  );
}
