import { prisma } from './prisma';

// ---------------------------------------------------------------------------
// "Píše…" + push notifikácie k správam. Zdieľané webom (app/api/messages*)
// aj appkou (app/api/mobile/messages/*), nech sa správanie nikdy nerozíde.
// ---------------------------------------------------------------------------

// Písanie platí 6 s od posledného "pingnutia" — appka aj web pingajú každé
// ~2,5 s, kým používateľ píše, takže indikátor nebliká.
export const TYPING_TTL_MS = 6000;

export async function setTyping(userId: string, otherId: string, typing: boolean) {
  // Len obyčajný text — objekt by Prisma vzala ako podmienku (napr. {"not": ""}).
  if (typeof userId !== 'string' || typeof otherId !== 'string' || !otherId || otherId.length > 64) return;
  if (!userId || !otherId || userId === otherId) return;
  if (typing) {
    await prisma.typingStatus.upsert({
      where: { userId_otherId: { userId, otherId } },
      create: { userId, otherId, updatedAt: new Date() },
      update: { updatedAt: new Date() }
    });
  } else {
    await prisma.typingStatus.deleteMany({ where: { userId, otherId } });
  }
}

// Píše práve "typerId" používateľovi "toId"?
export async function isTypingTo(typerId: string, toId: string) {
  if (typeof typerId !== 'string' || typeof toId !== 'string' || typerId.length > 64) return false;
  const row = await prisma.typingStatus.findUnique({ where: { userId_otherId: { userId: typerId, otherId: toId } } });
  return !!row && Date.now() - row.updatedAt.getTime() < TYPING_TTL_MS;
}

// Kto všetko práve píše používateľovi "toId" (pre zoznam konverzácií).
export async function typersTo(toId: string) {
  const rows = await prisma.typingStatus.findMany({
    where: { otherId: toId, updatedAt: { gte: new Date(Date.now() - TYPING_TTL_MS) } },
    select: { userId: true }
  });
  return new Set(rows.map((r) => r.userId));
}

// ---------------------------------------------------------------------------
// Push notifikácia o novej správe cez Expo Push API (bez kľúča, zadarmo).
// Nikdy nezhodí odoslanie správy — pri chybe sa len zaloguje.
// ---------------------------------------------------------------------------
export async function sendMessagePush(
  receiverId: string,
  sender: { id: string; name: string; avatar: string | null },
  preview: string
) {
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId: receiverId, notifyMessages: true } });
    if (tokens.length === 0) return;

    const unread = await prisma.message.count({ where: { receiverId, read: false } });
    const body = preview.length > 120 ? preview.slice(0, 117) + '…' : preview;
    const payload = tokens.map((t) => ({
      to: t.token,
      title: sender.name,
      body,
      sound: t.sound ? 'default' : null,
      badge: unread,
      channelId: t.sound ? 'messages' : 'messages-silent',
      priority: 'high',
      data: { type: 'message', userId: sender.id, name: sender.name, avatar: sender.avatar }
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const json: any = await res.json().catch(() => null);

    // Zariadenia, kde bola appka odinštalovaná, Expo označí ako neregistrované — zmažeme ich.
    const tickets: any[] = json?.data || [];
    const dead = tickets
      .map((ticket, i) => (ticket?.details?.error === 'DeviceNotRegistered' ? tokens[i]?.token : null))
      .filter(Boolean) as string[];
    if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
  } catch (e) {
    console.error('[sendMessagePush]', e);
  }
}
