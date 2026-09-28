import { prisma } from './prisma';

// ---------------------------------------------------------------------------
// Aktivita obľúbených — jeden zdroj pravdy pre web (/aktivita) aj appku
// (/api/mobile/favorites-activity). Skladá sa z existujúcich tabuliek
// (recenzie, hodnotenia, komentáre, lajky, sledovania, Chcem vidieť,
// obľúbené, diskusie, články), takže celá história je k dispozícii hneď.
// Zmeny profilu (nová fotka, upravené údaje) sa nikde inde neukladajú, preto
// majú vlastnú malú tabuľku FeedEvent (zapisuje recordProfileChanges nižšie).
// Každý záznam má "kind" — texty si podľa neho skladá až web/appka (web po
// slovensky cez preklady, appka po česky), knižnica vracia len dáta.
// ---------------------------------------------------------------------------

export type FeedType = 'all' | 'reviews' | 'ratings' | 'other';

const FAVORITES_LIST_TITLE = 'Obľúbené';
const actorSelect = { id: true, name: true, avatar: true, gender: true } as const;
const movieSelect = { id: true, title: true, slug: true, poster: true, year: true, contentType: true } as const;

export function buildDisplayTitle(
  movieTitle: string,
  season: { number: number } | null,
  episode: { number: number; title: string | null } | null
) {
  if (episode && season) return `${movieTitle} - S${season.number}E${episode.number}${episode.title ? `: ${episode.title}` : ''}`;
  if (season) return `${movieTitle} - Sezóna ${season.number}`;
  return movieTitle;
}

function movieTarget(m: any, season?: { number: number } | null, episode?: { number: number; title: string | null } | null) {
  return {
    ...m,
    displayTitle: buildDisplayTitle(m.title, season || null, episode || null),
    seasonNumber: season?.number ?? null,
    episodeNumber: episode?.number ?? null
  };
}

function snippet(text: string | null | undefined, n = 140) {
  const plain = (text || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > n ? plain.slice(0, n).trim() + '…' : plain;
}

export async function getFavoritesFeed(viewerId: string, opts: { type?: FeedType; page?: number; pageSize?: number } = {}) {
  const type: FeedType = opts.type || 'all';
  const page = Math.max(0, opts.page || 0);
  const pageSize = opts.pageSize || 10;

  const follows = await prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
  const ids = follows.map((f) => f.followingId);
  if (ids.length === 0) return { items: [] as any[], hasMore: false };

  const take = (page + 1) * pageSize + 1;
  const wantReviews = type === 'all' || type === 'reviews';
  const wantRatings = type === 'all' || type === 'ratings';
  const wantOther = type === 'all' || type === 'other';
  const none = Promise.resolve([] as any[]);
  const now = new Date();

  const [
    reviews,
    ratings,
    comments,
    likes,
    newFollows,
    personFollows,
    watchlist,
    favorites,
    posts,
    threads,
    articles,
    profileEvents,
    followersOfViewer
  ] = await Promise.all([
    wantReviews
      ? prisma.review.findMany({
          where: { authorId: { in: ids } },
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true, body: true, createdAt: true, movieId: true, seasonId: true, episodeId: true, authorId: true,
            movie: { select: movieSelect },
            season: { select: { number: true } },
            episode: { select: { number: true, title: true } },
            author: { select: actorSelect }
          }
        })
      : none,
    wantRatings
      ? prisma.rating.findMany({
          where: { userId: { in: ids } },
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true, value: true, createdAt: true,
            movie: { select: movieSelect },
            season: { select: { number: true } },
            episode: { select: { number: true, title: true } },
            user: { select: actorSelect }
          }
        })
      : none,
    wantOther
      ? prisma.comment.findMany({
          where: { userId: { in: ids }, OR: [{ newsId: { not: null } }, { movieId: { not: null } }, { reviewId: { not: null } }] },
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true, body: true, createdAt: true, parentId: true,
            user: { select: actorSelect },
            news: { select: { id: true, title: true, slug: true, coverImage: true } },
            movie: { select: movieSelect },
            review: { select: { id: true, author: { select: { id: true, name: true } }, movie: { select: movieSelect } } }
          }
        })
      : none,
    wantOther
      ? prisma.like.findMany({
          // Len "páči sa mi" — nepáči sa mi sa obľúbeným zámerne nezobrazuje.
          where: { userId: { in: ids }, value: 1, OR: [{ newsId: { not: null } }, { reviewId: { not: null } }] },
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true, createdAt: true,
            user: { select: actorSelect },
            news: { select: { id: true, title: true, slug: true, coverImage: true } },
            review: { select: { id: true, author: { select: { id: true, name: true } }, movie: { select: movieSelect } } }
          }
        })
      : none,
    wantOther
      ? prisma.follow.findMany({
          where: { followerId: { in: ids } },
          orderBy: { createdAt: 'desc' },
          take,
          select: { id: true, createdAt: true, follower: { select: actorSelect }, following: { select: { id: true, name: true, avatar: true } } }
        })
      : none,
    wantOther
      ? prisma.personFollow.findMany({
          where: { userId: { in: ids } },
          orderBy: { createdAt: 'desc' },
          take,
          select: { id: true, createdAt: true, user: { select: actorSelect }, person: { select: { id: true, name: true, slug: true, photo: true, role: true } } }
        })
      : none,
    wantOther
      ? prisma.watchlistItem.findMany({
          where: { userId: { in: ids } },
          orderBy: { createdAt: 'desc' },
          take,
          select: { id: true, createdAt: true, user: { select: actorSelect }, movie: { select: movieSelect } }
        })
      : none,
    wantOther
      ? prisma.movieListItem.findMany({
          where: { list: { title: FAVORITES_LIST_TITLE, authorId: { in: ids } } },
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true, createdAt: true, movie: { select: movieSelect },
            list: { select: { author: { select: { ...actorSelect, favoritesVisibility: true } } } }
          }
        })
      : none,
    wantOther
      ? prisma.post.findMany({
          where: { authorId: { in: ids } },
          orderBy: { createdAt: 'desc' },
          take,
          select: { id: true, body: true, createdAt: true, author: { select: actorSelect }, thread: { select: { id: true, title: true } } }
        })
      : none,
    wantOther
      ? prisma.thread.findMany({
          where: { authorId: { in: ids } },
          orderBy: { createdAt: 'desc' },
          take,
          select: { id: true, title: true, body: true, createdAt: true, author: { select: actorSelect } }
        })
      : none,
    wantOther
      ? prisma.newsPost.findMany({
          where: { authorId: { in: ids }, isDraft: false, OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
          orderBy: { createdAt: 'desc' },
          take,
          select: { id: true, title: true, slug: true, summary: true, coverImage: true, createdAt: true, publishAt: true, author: { select: actorSelect } }
        })
      : none,
    wantOther
      ? prisma.feedEvent.findMany({
          where: { userId: { in: ids } },
          orderBy: { createdAt: 'desc' },
          take,
          select: { id: true, type: true, createdAt: true, user: { select: actorSelect } }
        })
      : none,
    wantOther ? prisma.follow.findMany({ where: { followingId: viewerId, followerId: { in: ids } }, select: { followerId: true } }) : none
  ]);

  // Pri recenziách dohľadáme hodnotenie autora (rovnako ako doteraz).
  const reviewRatings = reviews.length
    ? await prisma.rating.findMany({
        where: { OR: reviews.map((r: any) => ({ movieId: r.movieId, userId: r.authorId, seasonId: r.seasonId, episodeId: r.episodeId })) },
        select: { movieId: true, userId: true, seasonId: true, episodeId: true, value: true }
      })
    : [];
  const followsViewer = new Set((followersOfViewer as any[]).map((f) => f.followerId));

  const items: any[] = [];

  for (const r of reviews as any[]) {
    const rating = reviewRatings.find((rt) => rt.movieId === r.movieId && rt.userId === r.authorId && rt.seasonId === r.seasonId && rt.episodeId === r.episodeId);
    items.push({ kind: 'review', id: r.id, createdAt: r.createdAt, body: r.body, rating: rating?.value ?? null, movie: movieTarget(r.movie, r.season, r.episode), author: r.author });
  }
  for (const r of ratings as any[]) {
    items.push({ kind: 'rating', id: r.id, createdAt: r.createdAt, rating: r.value, movie: movieTarget(r.movie, r.season, r.episode), author: r.user });
  }
  for (const c of comments as any[]) {
    if (c.news) items.push({ kind: 'news_comment', id: c.id, createdAt: c.createdAt, author: c.user, snippet: snippet(c.body), isReply: !!c.parentId, news: c.news });
    else if (c.review) items.push({ kind: 'review_comment', id: c.id, createdAt: c.createdAt, author: c.user, snippet: snippet(c.body), reviewAuthor: c.review.author, movie: movieTarget(c.review.movie) });
    else if (c.movie) items.push({ kind: 'movie_comment', id: c.id, createdAt: c.createdAt, author: c.user, snippet: snippet(c.body), movie: movieTarget(c.movie) });
  }
  for (const l of likes as any[]) {
    if (l.news) items.push({ kind: 'news_like', id: l.id, createdAt: l.createdAt, author: l.user, news: l.news });
    else if (l.review) items.push({ kind: 'review_like', id: l.id, createdAt: l.createdAt, author: l.user, reviewAuthor: l.review.author, movie: movieTarget(l.review.movie) });
  }
  for (const f of newFollows as any[]) {
    items.push({ kind: 'follow', id: f.id, createdAt: f.createdAt, author: f.follower, targetUser: f.following, isViewer: f.following.id === viewerId });
  }
  for (const p of personFollows as any[]) {
    items.push({ kind: 'person_follow', id: p.id, createdAt: p.createdAt, author: p.user, person: p.person });
  }
  for (const w of watchlist as any[]) {
    items.push({ kind: 'watchlist', id: w.id, createdAt: w.createdAt, author: w.user, movie: movieTarget(w.movie) });
  }
  for (const f of favorites as any[]) {
    // Rešpektuje nastavenie viditeľnosti obľúbených (rovnako ako profil).
    const author = f.list.author;
    if (author.favoritesVisibility === 'ONLY_ME') continue;
    if (author.favoritesVisibility === 'ONLY_FAVORITES' && !followsViewer.has(author.id)) continue;
    const { favoritesVisibility, ...actor } = author;
    items.push({ kind: 'favorite', id: f.id, createdAt: f.createdAt, author: actor, movie: movieTarget(f.movie) });
  }
  for (const p of posts as any[]) {
    items.push({ kind: 'thread_post', id: p.id, createdAt: p.createdAt, author: p.author, snippet: snippet(p.body), thread: p.thread });
  }
  for (const t of threads as any[]) {
    items.push({ kind: 'thread', id: t.id, createdAt: t.createdAt, author: t.author, snippet: snippet(t.body), thread: { id: t.id, title: t.title } });
  }
  for (const a of articles as any[]) {
    items.push({ kind: 'news_post', id: a.id, createdAt: a.publishAt || a.createdAt, author: a.author, snippet: snippet(a.summary), news: { id: a.id, title: a.title, slug: a.slug, coverImage: a.coverImage } });
  }
  for (const e of profileEvents as any[]) {
    items.push({ kind: e.type === 'AVATAR' ? 'avatar' : 'profile_info', id: e.id, createdAt: e.createdAt, author: e.user });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pageItems = items.slice(page * pageSize, page * pageSize + pageSize);
  return { items: pageItems, hasMore: items.length > (page + 1) * pageSize };
}

// ---------------------------------------------------------------------------
// Zápis zmien profilu do aktivity. Volá sa po uložení profilu (web aj appka).
// Viac uložení za sebou (napr. do 30 min) sa zlúči do jedného záznamu.
// ---------------------------------------------------------------------------
const PROFILE_INFO_FIELDS = [
  'bio', 'firstName', 'lastName', 'gender', 'tagline', 'country', 'region', 'birthDate',
  'homepage', 'facebookUrl', 'instagramUrl', 'tiktokUrl', 'xUrl', 'youtubeUrl', 'spotifyUrl', 'linkedinUrl', 'snapchatUrl', 'blueskyUrl'
];
const MERGE_WINDOW_MS = 30 * 60 * 1000;

function sameValue(a: any, b: any) {
  const norm = (v: any) => (v instanceof Date ? v.toISOString().slice(0, 10) : v === undefined || v === null ? '' : String(v));
  return norm(a) === norm(b);
}

async function touchEvent(userId: string, type: 'AVATAR' | 'PROFILE_INFO') {
  const recent = await prisma.feedEvent.findFirst({
    where: { userId, type, createdAt: { gte: new Date(Date.now() - MERGE_WINDOW_MS) } },
    orderBy: { createdAt: 'desc' }
  });
  if (recent) await prisma.feedEvent.update({ where: { id: recent.id }, data: { createdAt: new Date() } });
  else await prisma.feedEvent.create({ data: { userId, type } });
}

export async function recordProfileChanges(userId: string, before: any, after: any) {
  try {
    if (!before || !after) return;
    if (after.avatar && after.avatar !== before.avatar) await touchEvent(userId, 'AVATAR');
    const infoChanged = PROFILE_INFO_FIELDS.some((f) => f in after && !sameValue(before[f], after[f]) && !!after[f]);
    if (infoChanged) await touchEvent(userId, 'PROFILE_INFO');
  } catch (e) {
    // Aktivita je len doplnok — chyba tu nikdy nesmie zhodiť uloženie profilu.
    console.error('[recordProfileChanges]', e);
  }
}
