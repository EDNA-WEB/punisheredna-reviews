import { prisma } from './prisma';
import { encryptMessageBody, tryDecryptMessageBody } from './serverCrypto';
import { checkRateLimit, looksLikeSpam } from './antiSpam';
import { getOrCreateConversation, sortedPair } from './conversation';
import { sendMessagePush } from './chatRealtime';
import { destroyVoice } from './voiceMessages';
import { destroyChatPhoto, isPhotoAvailable } from './photoMessages';

// ---------------------------------------------------------------------------
// Akcie so správami (ako Discord) — spoločné pre appku aj web:
// reakcie, úprava, odpoveď, preposlanie, pripnutie, zmazanie.
//  • zmazať môže autor KEDYKOĽVEK a správa zmizne obom (aj fotka/hlasovka)
//  • upraviť môže autor text správy alebo popis fotky (hlasovku nie)
//  • pripnúť/odopnúť môže ktokoľvek z dvojice
//  • preposlať sa dá text a fotka (hlasovka nie — má vlastné pravidlá mazania)
// ---------------------------------------------------------------------------

export type ActionResult = { status: number; error?: string; data?: any };

// Polia správy potrebné pre akcie a zobrazenie (doplnok k selectom vlákna).
export const MESSAGE_EXTRA_SELECT = { editedAt: true, replyToId: true, forwarded: true, pinnedAt: true } as const;

const MAX_REACTIONS_PER_USER = 20;
// RegExp cez text — TypeScript by pri starom „target“ odmietol \p{…} v literáli.
const EMOJI_RE = new RegExp('^(?:\\p{Extended_Pictographic}|\\p{Emoji_Component}|\\u200d|\\ufe0f|\\u20e3)+$', 'u');
const PICTO_RE = new RegExp('\\p{Extended_Pictographic}', 'u');

export function isValidEmoji(e: unknown): e is string {
  return typeof e === 'string' && e.length > 0 && e.length <= 16 && EMOJI_RE.test(e) && PICTO_RE.test(e);
}

// Otvorený chat druhej strany sa podľa tohto obnoví aj bez novej správy.
export async function touchConversation(a: string, b: string) {
  const [userAId, userBId] = sortedPair(a, b);
  await prisma.conversation.updateMany({ where: { userAId, userBId }, data: { activityAt: new Date() } }).catch(() => {});
}

export async function conversationActivity(a: string, b: string) {
  const [userAId, userBId] = sortedPair(a, b);
  const c = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } }, select: { activityAt: true } });
  return c?.activityAt ? c.activityAt.getTime() : 0;
}

type PreviewRow = {
  id: string;
  senderId: string;
  body: string | null;
  iv: string | null;
  image?: string | null;
  photo?: boolean;
  voice?: boolean;
};

// Krátky náhľad správy (pre odpoveď, pripnuté, preposlanie).
export function previewOf(m: PreviewRow) {
  const kind = m.voice ? 'voice' : m.photo || m.image ? 'image' : 'text';
  let text = '';
  if (!m.voice && m.body) text = m.iv ? tryDecryptMessageBody(m.body, m.iv) || '' : m.body;
  if (text.length > 120) text = text.slice(0, 117) + '…';
  return { id: m.id, senderId: m.senderId, kind, text };
}

// Odpoveď môže ukazovať len na správu z tej istej konverzácie.
export async function validReplyTo(raw: unknown, a: string, b: string): Promise<string | null> {
  if (typeof raw !== 'string' || !raw || raw.length > 64) return null;
  const m = await prisma.message.findFirst({
    where: {
      id: raw,
      OR: [
        { senderId: a, receiverId: b },
        { senderId: b, receiverId: a }
      ]
    },
    select: { id: true }
  });
  return m?.id || null;
}

// Reakcie, odpovede a pripnuté správy k načítanému vláknu — 1–2 dopyty navyše.
export async function buildThreadExtras(
  raw: Array<PreviewRow & { replyToId?: string | null; pinnedAt?: Date | null }>,
  myId: string
) {
  const ids = raw.map((m) => m.id);
  const byId = new Map<string, PreviewRow>(raw.map((m) => [m.id, m] as [string, PreviewRow]));

  const reactionRows = ids.length
    ? await prisma.messageReaction.findMany({
        where: { messageId: { in: ids } },
        select: { messageId: true, userId: true, emoji: true },
        orderBy: { createdAt: 'asc' }
      })
    : [];
  const reactions = new Map<string, Array<{ emoji: string; count: number; mine: boolean }>>();
  for (const r of reactionRows) {
    const list = reactions.get(r.messageId) || [];
    let item = list.find((x) => x.emoji === r.emoji);
    if (!item) {
      item = { emoji: r.emoji, count: 0, mine: false };
      list.push(item);
    }
    item.count++;
    if (r.userId === myId) item.mine = true;
    reactions.set(r.messageId, list);
  }

  // Odpovede na správy mimo načítaného zoznamu (napr. pred „zmazaním pre mňa“)
  const missing = Array.from(new Set(raw.map((m) => m.replyToId).filter((x): x is string => !!x && !byId.has(x))));
  const extra = missing.length
    ? await prisma.message.findMany({
        where: { id: { in: missing } },
        select: { id: true, senderId: true, body: true, iv: true, image: true, photo: true, voice: true }
      })
    : [];
  for (const m of extra) byId.set(m.id, m);

  const replyTo = (id?: string | null) => {
    if (!id) return null;
    const m = byId.get(id);
    return m ? previewOf(m) : { id, deleted: true };
  };

  const pinned = raw
    .filter((m) => m.pinnedAt)
    .sort((x, y) => (y.pinnedAt as Date).getTime() - (x.pinnedAt as Date).getTime())
    .map((m) => ({ ...previewOf(m), pinnedAt: (m.pinnedAt as Date).toISOString() }));

  return { reactions: (id: string) => reactions.get(id) || [], replyTo, pinned };
}

async function participantMessage(id: string, userId: string) {
  if (typeof id !== 'string' || !id || id.length > 64) return null;
  const m = await prisma.message.findUnique({ where: { id } });
  if (!m || (m.senderId !== userId && m.receiverId !== userId)) return null;
  return m;
}

// --- Úprava ------------------------------------------------------------------
export async function editMessage(id: string, userId: string, rawBody: unknown): Promise<ActionResult> {
  const m = await participantMessage(id, userId);
  if (!m) return { status: 404, error: 'Zpráva se nenašla.' };
  if (m.senderId !== userId) return { status: 403, error: 'Upravit můžeš jen vlastní zprávu.' };
  if (m.voice) return { status: 400, error: 'Hlasovou zprávu nelze upravit.' };
  const body = typeof rawBody === 'string' ? rawBody.trim() : '';
  const hasPhoto = !!m.photo || !!m.image;
  if (!body && !hasPhoto) return { status: 400, error: 'Zpráva nemůže být prázdná.' };
  if (body.length > 3000) return { status: 400, error: 'Zpráva je příliš dlouhá.' };
  if (body) {
    const spam = looksLikeSpam(body);
    if (spam) return { status: 400, error: spam };
  }
  const enc = body ? encryptMessageBody(body) : null;
  await prisma.message.update({
    where: { id: m.id },
    data: { body: enc ? enc.ciphertext : null, iv: enc ? enc.iv : null, editedAt: new Date() }
  });
  await touchConversation(m.senderId, m.receiverId);
  return { status: 200, data: { ok: true, body: body || null } };
}

// --- Zmazanie (kedykoľvek, obom) -----------------------------------------------
export async function deleteMessage(id: string, userId: string): Promise<ActionResult> {
  const m = await participantMessage(id, userId);
  if (!m) return { status: 404, error: 'Zpráva se nenašla.' };
  if (m.senderId !== userId) return { status: 403, error: 'Smazat můžeš jen vlastní zprávu.' };

  if (m.audioPublicId) await destroyVoice(m.audioPublicId);
  if (m.image) {
    // Preposlaná kópia používa ten istý súbor — zmaže sa, až keď ho nikto nepotrebuje.
    const shared = m.imagePublicId
      ? await prisma.message.count({ where: { imagePublicId: m.imagePublicId, id: { not: m.id } } })
      : 0;
    if (!shared) await destroyChatPhoto(m.imagePublicId, m.image);
  }
  await prisma.message.delete({ where: { id: m.id } });
  await touchConversation(m.senderId, m.receiverId);
  return { status: 200, data: { ok: true } };
}

// --- Reakcia (prepínač) ------------------------------------------------------
export async function toggleReaction(id: string, userId: string, emoji: unknown): Promise<ActionResult> {
  if (!isValidEmoji(emoji)) return { status: 400, error: 'Neplatná reakce.' };
  const m = await participantMessage(id, userId);
  if (!m) return { status: 404, error: 'Zpráva se nenašla.' };

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId: m.id, userId, emoji } },
    select: { id: true }
  });
  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    const count = await prisma.messageReaction.count({ where: { messageId: m.id, userId } });
    if (count >= MAX_REACTIONS_PER_USER) return { status: 400, error: 'Příliš mnoho reakcí.' };
    try {
      await prisma.messageReaction.create({ data: { messageId: m.id, userId, emoji } });
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e; // dvojklik — reakcia už existuje
    }
  }
  await touchConversation(m.senderId, m.receiverId);
  return { status: 200, data: { ok: true, active: !existing } };
}

// --- Pripnutie ---------------------------------------------------------------
export async function setPinned(id: string, userId: string, pinned: unknown): Promise<ActionResult> {
  const m = await participantMessage(id, userId);
  if (!m) return { status: 404, error: 'Zpráva se nenašla.' };
  const on = !!pinned;
  await prisma.message.update({
    where: { id: m.id },
    data: on ? { pinnedAt: new Date(), pinnedById: userId } : { pinnedAt: null, pinnedById: null }
  });
  await touchConversation(m.senderId, m.receiverId);
  return { status: 200, data: { ok: true, pinned: on } };
}

// --- Kontrola, či smie A písať B (rovnaká ako pri bežnej správe) -------------
export async function checkCanMessage(senderId: string, receiverId: unknown): Promise<ActionResult> {
  if (typeof receiverId !== 'string' || !receiverId || receiverId.length > 64 || receiverId === senderId) {
    return { status: 400, error: 'Neplatný příjemce.' };
  }
  const sender = await prisma.user.findUnique({ where: { id: senderId } });
  if (!sender || sender.banned) return { status: 403, error: 'Tvůj účet byl zablokován.' };

  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
  if (!receiver) return { status: 404, error: 'Příjemce se nenašel.' };

  const blocked = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: senderId, blockedId: receiverId },
        { blockerId: receiverId, blockedId: senderId }
      ]
    }
  });
  if (blocked) {
    return { status: 403, error: blocked.blockerId === senderId ? 'Tohoto uživatele jsi zablokoval.' : 'Tento uživatel tě zablokoval.' };
  }

  const conversation = await getOrCreateConversation(senderId, receiverId, senderId);
  if (conversation.status === 'DECLINED') return { status: 403, error: 'Tato osoba odmítla s tebou komunikovat.' };
  if (conversation.status === 'PENDING' && conversation.initiatorId === senderId) {
    const alreadySent = await prisma.message.count({ where: { senderId, receiverId } });
    if (alreadySent > 0) return { status: 403, error: 'Už jsi poslal jednu zprávu — počkej, až ji druhá strana potvrdí.' };
  }

  const rateLimitError = await checkRateLimit('message', senderId, sender.createdAt);
  if (rateLimitError) return { status: 429, error: rateLimitError };

  return { status: 200, data: { sender, conversation } };
}

// --- Preposlanie -------------------------------------------------------------
export async function forwardMessage(id: string, userId: string, receiverId: unknown): Promise<ActionResult> {
  const m = await participantMessage(id, userId);
  if (!m) return { status: 404, error: 'Zpráva se nenašla.' };
  if (m.voice) return { status: 400, error: 'Hlasovou zprávu nelze přeposlat.' };

  const hasImage = !!m.image && isPhotoAvailable(m);
  const text = m.body ? (m.iv ? tryDecryptMessageBody(m.body, m.iv) : m.body) || '' : '';
  if (!hasImage && !text) return { status: 410, error: 'Tuto zprávu už nelze přeposlat (fotka vypršela).' };

  const can = await checkCanMessage(userId, receiverId);
  if (can.status !== 200) return can;
  const { sender } = can.data;
  const target = receiverId as string;

  const enc = text ? encryptMessageBody(text) : null;
  const created = await prisma.message.create({
    data: {
      senderId: userId,
      receiverId: target,
      body: enc ? enc.ciphertext : null,
      iv: enc ? enc.iv : null,
      forwarded: true,
      // Fotka: ten istý súbor a ten istý čas zániku ako originál (nezaberá miesto navyše).
      ...(hasImage
        ? {
            image: m.image,
            imagePublicId: m.imagePublicId,
            photo: true,
            imageExpiresAt: m.imageExpiresAt || new Date(m.createdAt.getTime() + 24 * 60 * 60 * 1000)
          }
        : {})
    }
  });

  await sendMessagePush(target, { id: sender.id, name: sender.name, avatar: sender.avatar }, hasImage ? '↪ 📷 Fotka' : `↪ ${text}`);
  return { status: 201, data: { ok: true, id: created.id } };
}
