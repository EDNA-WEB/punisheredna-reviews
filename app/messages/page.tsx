import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { IconUser, IconMessage } from '@/components/Icons';
import NewMessageSearch from '@/components/NewMessageSearch';
import ChatPolling from '@/components/ChatPolling';
import { decryptMessageBody } from '@/lib/serverCrypto';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const myId = (session.user as any).id;

  const myDeletions = await prisma.conversationDeletion.findMany({ where: { userId: myId } });
  const deletionByOtherId = new Map(myDeletions.map((d) => [d.otherId, d.deletedAt]));

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
    const myDeletedAt = deletionByOtherId.get(other.id);
    if (myDeletedAt && m.createdAt <= myDeletedAt) continue; // ja som si túto konverzáciu vymazal(a) po tento bod

    if (!conversations.has(other.id)) {
      const lastText = m.image ? '📷 Fotka' : m.body && m.iv ? decryptMessageBody(m.body, m.iv) : m.body || '';
      conversations.set(other.id, {
        user: other,
        lastText,
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
      <ChatPolling intervalMs={8000} />
      <h1 className="font-display font-extrabold text-3xl text-ink mb-6">Pošta</h1>

      <div className="grid md:grid-cols-[340px_1fr] gap-6 border border-line rounded-xl overflow-hidden bg-card min-h-[420px]">
        <div className="border-b md:border-b-0 md:border-r border-line p-4">
          <NewMessageSearch />

          {list.length === 0 ? (
            <div className="text-sm text-muted text-center py-10 px-4">
              Zatiaľ nemáš žiadne konverzácie. Nájdi si niekoho vyššie a napíš mu.
            </div>
          ) : (
            <div className="space-y-1 -mx-4">
              {list.map((c) => (
                <Link
                  key={c.user.id}
                  href={`/messages/${c.user.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors ${c.unread > 0 ? 'bg-accent/5' : ''}`}
                >
                  {c.user.avatar ? (
                    <img src={c.user.avatar} alt={c.user.name} className="w-11 h-11 rounded-full object-cover flex-none" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-surface flex items-center justify-center flex-none">
                      <IconUser className="w-5 h-5 text-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink text-sm truncate">{c.user.name}</span>
                      <span className="text-[11px] text-muted flex-none">
                        {new Date(c.lastAt).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted truncate">
                      {(() => {
                        const st = statusByOtherId.get(c.user.id);
                        if (st?.status === 'DECLINED') return <span className="text-danger">Zamietnuté</span>;
                        if (st?.status === 'PENDING' && st.initiatorId === myId) return <span className="text-amber-600">Čaká na potvrdenie</span>;
                        if (st?.status === 'PENDING') return <span className="text-accent font-semibold">Chce s tebou komunikovať</span>;
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
                    <span className="w-5 h-5 bg-accent text-white text-[11px] font-bold rounded-full flex items-center justify-center flex-none">
                      {c.unread}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="hidden md:flex flex-col items-center justify-center text-center p-10 bg-surface/40">
          <IconMessage className="w-10 h-10 text-line mb-3" />
          <p className="text-sm text-muted max-w-xs">
            Vyber konverzáciu zo zoznamu vľavo, alebo si vyhľadaj niekoho a napíš mu.
          </p>
        </div>
      </div>
    </div>
  );
}
