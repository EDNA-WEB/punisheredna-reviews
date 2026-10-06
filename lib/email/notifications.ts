import { prisma } from '../prisma';
import { sendMany, OutgoingEmail } from './send';
import { newsTemplate, onlineTemplate, messageTemplate } from './templates';
import { siteUrl, unsubscribeUrl, unsubscribeApiUrl } from './util';

// ---------------------------------------------------------------------------
// Oznámenia e-mailom: novinky (ručne z administrácie), „film je online“ a
// nová správa (oboje spúšťa cron /api/cron/emails každých 10 minút).
// Posiela sa len overeným, nezmazaným a nezablokovaným účtom, ktoré majú
// daný druh oznámenia zapnutý.
// ---------------------------------------------------------------------------

const ACTIVE = { emailVerified: true, deleted: false, banned: false } as const;

const withUnsub = (userId: string, topic: 'news' | 'online' | 'messages') => ({
  page: unsubscribeUrl(userId, topic),
  api: unsubscribeApiUrl(userId, topic)
});

// --- Novinka -----------------------------------------------------------------
export async function sendNewsEmail(newsId: string, force = false) {
  const news = await prisma.newsPost.findUnique({
    where: { id: newsId },
    select: { id: true, title: true, slug: true, summary: true, coverImage: true, isDraft: true, publishAt: true, emailedAt: true }
  });
  if (!news) return { error: 'Novinka neexistuje.', status: 404 } as const;
  if (news.isDraft || (news.publishAt && news.publishAt > new Date())) return { error: 'Novinka ještě není zveřejněná.', status: 400 } as const;
  if (news.emailedAt && !force) return { error: 'already', emailedAt: news.emailedAt.toISOString(), status: 409 } as const;

  const users = await prisma.user.findMany({ where: { ...ACTIVE, emailNews: true }, select: { id: true, email: true } });
  const url = `${siteUrl()}/news/${news.slug}`;
  const emails: OutgoingEmail[] = users.map((u) => {
    const un = withUnsub(u.id, 'news');
    return { to: u.email, unsubscribeUrl: un.api, ...newsTemplate({ title: news.title, summary: news.summary, coverImage: news.coverImage, url }, un.page) };
  });
  const sent = await sendMany(emails);
  await prisma.newsPost.update({ where: { id: news.id }, data: { emailedAt: new Date(), emailedCount: sent } });
  return { ok: true, recipients: users.length, sent } as const;
}

// --- Film je online ------------------------------------------------------------
const MOVIES_PER_RUN = 15;

export async function processOnlineNotifications() {
  // Odkaz zmizol → pri ďalšom pridaní sa znova upozorní.
  await prisma.$executeRaw`
    UPDATE "Movie" m SET "onlineNotifiedAt" = NULL
    WHERE m."onlineNotifiedAt" IS NOT NULL AND m."watchUrl" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "Episode" e JOIN "Season" s ON s.id = e."seasonId" WHERE s."movieId" = m.id AND e."onlineUrl" IS NOT NULL)`;

  const pending = await prisma.$queryRaw<{ id: string }[]>`
    SELECT m.id FROM "Movie" m
    WHERE m.approved = true AND m."onlineNotifiedAt" IS NULL
      AND (m."watchUrl" IS NOT NULL OR EXISTS (SELECT 1 FROM "Episode" e JOIN "Season" s ON s.id = e."seasonId" WHERE s."movieId" = m.id AND e."onlineUrl" IS NOT NULL))
    ORDER BY m."createdAt" DESC
    LIMIT ${MOVIES_PER_RUN}`;

  let sent = 0;
  for (const { id } of pending) {
    const movie = await prisma.movie.findUnique({
      where: { id },
      select: { id: true, title: true, slug: true, year: true, genres: true, poster: true, hasSubtitles: true, hasDubbing: true }
    });
    if (!movie) continue;
    // Označiť hneď — ani pri chybe sa nepošle dvakrát.
    await prisma.movie.update({ where: { id }, data: { onlineNotifiedAt: new Date() } });

    const [watch, favs] = await Promise.all([
      prisma.watchlistItem.findMany({ where: { movieId: id }, select: { userId: true } }),
      prisma.movieListItem.findMany({ where: { movieId: id, list: { title: 'Obľúbené' } }, select: { list: { select: { authorId: true } } } })
    ]);
    const ids = Array.from(new Set([...watch.map((w) => w.userId), ...favs.map((f) => f.list.authorId)]));
    if (!ids.length) continue;
    const users = await prisma.user.findMany({
      where: { id: { in: ids }, ...ACTIVE, emailOnline: true },
      select: { id: true, email: true, role: true, membershipUntil: true }
    });
    const meta = [movie.year, (movie.genres || '').split(',').slice(0, 2).map((g) => g.trim()).filter(Boolean).join(', '), movie.hasDubbing ? 'CZ dabing' : movie.hasSubtitles ? 'CZ titulky' : '']
      .filter(Boolean)
      .join(' · ');
    const url = `${siteUrl()}/movie/${movie.slug}`;
    const now = new Date();
    const emails = users.map((u) => {
      const un = withUnsub(u.id, 'online');
      const canPlay = u.role === 'ADMIN' || (!!u.membershipUntil && u.membershipUntil > now);
      return { to: u.email, unsubscribeUrl: un.api, ...onlineTemplate({ title: movie.title, meta, poster: movie.poster, url }, canPlay, un.page) };
    });
    sent += await sendMany(emails);
  }
  return { movies: pending.length, sent };
}

// --- Nová správa ---------------------------------------------------------------
const MESSAGE_DELAY_MIN = 3; // ak si správu prečíta do 3 minút, e-mail nepríde
const MESSAGE_WINDOW_MIN = 60;
const THROTTLE_MIN = 60; // z jednej konverzácie najviac 1 e-mail za hodinu

export async function processMessageNotifications() {
  const now = Date.now();
  const messages = await prisma.message.findMany({
    where: {
      read: false,
      createdAt: { gte: new Date(now - MESSAGE_WINDOW_MIN * 60_000), lte: new Date(now - MESSAGE_DELAY_MIN * 60_000) },
      receiver: { ...ACTIVE, emailMessages: true }
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      senderId: true,
      receiverId: true,
      body: true,
      iv: true,
      voice: true,
      photo: true,
      image: true,
      sender: { select: { name: true, deleted: true } },
      receiver: { select: { email: true } }
    }
  });

  // Najnovšia správa z každej konverzácie
  const latest = new Map<string, (typeof messages)[number]>();
  for (const m of messages) {
    const k = `msg:${m.receiverId}:${m.senderId}`;
    if (!latest.has(k)) latest.set(k, m);
  }
  if (!latest.size) return { sent: 0 };

  const keys = Array.from(latest.keys());
  const [throttled, blocks] = await Promise.all([
    prisma.emailThrottle.findMany({ where: { key: { in: keys }, sentAt: { gte: new Date(now - THROTTLE_MIN * 60_000) } }, select: { key: true } }),
    prisma.blockedUser.findMany({
      where: { OR: Array.from(latest.values()).map((m) => ({ blockerId: m.receiverId, blockedId: m.senderId })) },
      select: { blockerId: true, blockedId: true }
    })
  ]);
  const skip = new Set(throttled.map((t) => t.key));
  blocks.forEach((b) => skip.add(`msg:${b.blockerId}:${b.blockedId}`));

  const emails: OutgoingEmail[] = [];
  const sentKeys: string[] = [];
  for (const [k, m] of Array.from(latest.entries())) {
    if (skip.has(k) || m.sender.deleted) continue;
    const preview = m.voice
      ? 'Poslal ti hlasovou zprávu.'
      : m.photo || m.image
        ? 'Poslal ti fotku.'
        : !m.iv && m.body
          ? m.body.length > 160
            ? `${m.body.slice(0, 157)}…`
            : m.body
          : 'Napsal ti novou zprávu.';
    const un = withUnsub(m.receiverId, 'messages');
    emails.push({
      to: m.receiver.email,
      unsubscribeUrl: un.api,
      ...messageTemplate(m.sender.name, preview, `${siteUrl()}/messages/${m.senderId}`, un.page)
    });
    sentKeys.push(k);
  }
  if (!emails.length) return { sent: 0 };

  const at = new Date();
  await prisma.$transaction(sentKeys.map((key) => prisma.emailThrottle.upsert({ where: { key }, create: { key, sentAt: at }, update: { sentAt: at } })));
  const sent = await sendMany(emails);
  // Staré záznamy obmedzenia
  await prisma.emailThrottle.deleteMany({ where: { sentAt: { lt: new Date(now - 7 * 86_400_000) } } });
  return { sent };
}
