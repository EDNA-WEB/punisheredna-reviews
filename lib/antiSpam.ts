import { prisma } from './prisma';

// Nová registrácia sa považuje za "čerstvú" počas tohto obdobia — má prísnejšie limity.
const NEW_ACCOUNT_MINUTES = 15;

export function isNewAccount(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() < NEW_ACCOUNT_MINUTES * 60_000;
}

// Rýchla heuristika na odchytenie zjavného spamu (odkazy, veľké písmená, opakujúce sa znaky).
export function looksLikeSpam(text: string): string | null {
  const urlMatches = text.match(/https?:\/\/\S+/gi) || [];
  if (urlMatches.length >= 3) return 'Príspevok obsahuje príliš veľa odkazov.';

  if (text.length > 25) {
    const letters = text.replace(/[^a-zA-ZáäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/g, '');
    const upper = letters.replace(/[^A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/g, '');
    if (letters.length > 15 && upper.length / letters.length > 0.75) {
      return 'Príspevok pôsobí ako spam (samé veľké písmená).';
    }
  }

  if (/(.)\1{9,}/.test(text)) return 'Príspevok obsahuje príliš veľa opakujúcich sa znakov.';

  return null;
}

type RateLimitTable = 'comment' | 'review' | 'post' | 'thread' | 'message' | 'like' | 'follow' | 'rating';

const LIMITS: Record<RateLimitTable, { windowSec: number; max: number; newAccountMax: number }> = {
  comment: { windowSec: 60, max: 6, newAccountMax: 2 },
  review: { windowSec: 300, max: 4, newAccountMax: 1 },
  post: { windowSec: 60, max: 6, newAccountMax: 2 },
  thread: { windowSec: 300, max: 3, newAccountMax: 1 },
  message: { windowSec: 60, max: 10, newAccountMax: 3 },
  like: { windowSec: 30, max: 20, newAccountMax: 8 },
  follow: { windowSec: 60, max: 15, newAccountMax: 5 },
  rating: { windowSec: 60, max: 30, newAccountMax: 15 }
};

// Vráti chybovú hlášku, ak používateľ prekročil limit počtu akcií za časové okno; inak null.
export async function checkRateLimit(table: RateLimitTable, userId: string, userCreatedAt: Date): Promise<string | null> {
  const limit = LIMITS[table];
  const max = isNewAccount(userCreatedAt) ? limit.newAccountMax : limit.max;
  const since = new Date(Date.now() - limit.windowSec * 1000);

  let count = 0;
  switch (table) {
    case 'comment':
      count = await prisma.comment.count({ where: { userId, createdAt: { gte: since } } });
      break;
    case 'review':
      count = await prisma.review.count({ where: { authorId: userId, createdAt: { gte: since } } });
      break;
    case 'post':
      count = await prisma.post.count({ where: { authorId: userId, createdAt: { gte: since } } });
      break;
    case 'thread':
      count = await prisma.thread.count({ where: { authorId: userId, createdAt: { gte: since } } });
      break;
    case 'message':
      count = await prisma.message.count({ where: { senderId: userId, createdAt: { gte: since } } });
      break;
    case 'like':
      count = await prisma.like.count({ where: { userId, createdAt: { gte: since } } });
      break;
    case 'follow':
      count = await prisma.follow.count({ where: { followerId: userId, createdAt: { gte: since } } });
      break;
    case 'rating':
      count = await prisma.rating.count({ where: { userId, createdAt: { gte: since } } });
      break;
  }

  if (count >= max) {
    return 'Príliš veľa príspevkov za krátky čas. Skús to prosím o pár minút.';
  }
  return null;
}
