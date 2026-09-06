import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import NewMessageSearch from '@/components/NewMessageSearch';
import MessagesListClient from '@/components/MessagesListClient';
import { IconMessage } from '@/components/Icons';

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
      sender: { select: { id: true, name: true, avatar: true, publicKey: true } },
      receiver: { select: { id: true, name: true, avatar: true, publicKey: true } }
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

  const conversations = new Map<
    string,
    {
      user: { id: string; name: string; avatar: string | null; publicKey: string | null };
      lastBody: string | null;
      lastIv: string | null;
      lastIsImage: boolean;
      lastAt: Date;
      unread: number;
      lastMine: boolean;
      status: { status: string; initiatorId: string } | null;
    }
  >();
  for (const m of messages) {
    const other = m.senderId === myId ? m.receiver : m.sender;
    const myDeletedAt = deletionByOtherId.get(other.id);
    if (myDeletedAt && m.createdAt <= myDeletedAt) continue; // ja som si túto konverzáciu vymazal(a) po tento bod

    if (!conversations.has(other.id)) {
      conversations.set(other.id, {
        user: other,
        lastBody: m.body,
        lastIv: m.iv,
        lastIsImage: !!m.image,
        lastAt: m.createdAt,
        unread: 0,
        lastMine: m.senderId === myId,
        status: statusByOtherId.get(other.id) || null
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

      <div className="grid md:grid-cols-[340px_1fr] gap-6 border border-line rounded-xl overflow-hidden bg-card min-h-[420px]">
        <div className="border-b md:border-b-0 md:border-r border-line p-4">
          <NewMessageSearch />

          {list.length === 0 ? (
            <div className="text-sm text-muted text-center py-10 px-4">
              Zatiaľ nemáš žiadne konverzácie. Nájdi si niekoho vyššie a napíš mu.
            </div>
          ) : (
            <MessagesListClient conversations={list} myId={myId} />
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
