import { prisma } from './prisma';
import { computeBlendedPercent } from './rating';
import { readingTime, youtubeVideoId } from './markdown';
import { sharpImage } from './imageQuality';
import { displayUserName } from './deletedUser';
import { publishedNewsFilterForMember } from './publishedFilter';
import type { ArticleCard, ArticleMovieData, ReadOnlyCommentData } from '@/components/article/ArticleView';

// Spoločné načítanie údajov pre nové zobrazenie článku — používa ho bežná
// stránka (/news, /blog) aj zdieľaná verzia (/sdilet/…). Zdieľaná verzia
// posiela vlastný prevod obrázkov (cez našu adresu), bežná len zaostrenie.

export type ImgFn = (url: string | null | undefined, cssWidth: number) => string | null;

export const plainImg: ImgFn = (url, w) => (url ? sharpImage(url, w) || url : null);

const publishedNews = () => ({ isDraft: false, OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] });

type Labels = { premiere: string; director: string; runtime: string; country: string; type: string };

function formatRuntime(min: number | null) {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

const splitList = (s: string | null | undefined) =>
  (s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

// Film/seriál priradený k novinke → karta filmu, fakty a herci.
export async function loadArticleMovie(
  movieId: string | null,
  opts: { viewerId?: string | null; readOnly: boolean; img: ImgFn; labels: Labels }
): Promise<{ movie: ArticleMovieData | null; trailerYoutubeId: string | null; movieTitle: string | null }> {
  if (!movieId) return { movie: null, trailerYoutubeId: null, movieTitle: null };
  const m = await prisma.movie.findUnique({
    where: { id: movieId },
    select: {
      id: true,
      title: true,
      slug: true,
      poster: true,
      year: true,
      genres: true,
      countries: true,
      contentType: true,
      runtimeMinutes: true,
      director: true,
      cast: true,
      releaseDate: true,
      trailerUrl: true,
      tmdbVoteAverage: true,
      tmdbVoteCount: true,
      ratings: { where: { seasonId: null, episodeId: null }, select: { value: true } },
      videos: { where: { seasonId: null, episodeId: null }, orderBy: { order: 'asc' }, take: 5, select: { url: true, category: true } }
    }
  });
  if (!m) return { movie: null, trailerYoutubeId: null, movieTitle: null };

  const trailerVideo = m.videos.find((v) => v.category === 'trailer') || m.videos[0];
  const trailerYoutubeId = (m.trailerUrl && youtubeVideoId(m.trailerUrl)) || (trailerVideo && youtubeVideoId(trailerVideo.url)) || null;

  const isSeries = m.contentType === 'Seriál';
  const facts: { label: string; value: string }[] = [];
  if (m.releaseDate) facts.push({ label: opts.labels.premiere, value: m.releaseDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' }) });
  else if (m.year) facts.push({ label: opts.labels.premiere, value: m.year });
  const directors = splitList(m.director);
  if (directors.length) facts.push({ label: opts.labels.director, value: directors.slice(0, 2).join(', ') });
  const rt = formatRuntime(m.runtimeMinutes);
  if (rt) facts.push({ label: opts.labels.runtime, value: rt });
  const countries = splitList(m.countries);
  if (countries.length) facts.push({ label: opts.labels.country, value: countries.slice(0, 2).join(', ') });
  if (facts.length < 4) facts.push({ label: opts.labels.type, value: m.contentType });

  const castNames = splitList(m.cast).slice(0, 6);
  const people = castNames.length
    ? await prisma.person.findMany({ where: { name: { in: castNames }, approved: true }, select: { name: true, slug: true, photo: true } })
    : [];
  const byName = new Map(people.map((p) => [p.name, p]));

  let inWatchlist: boolean | null = null;
  if (!opts.readOnly && opts.viewerId) {
    inWatchlist = !!(await prisma.watchlistItem.findUnique({ where: { userId_movieId: { userId: opts.viewerId, movieId: m.id } }, select: { id: true } }));
  }

  return {
    trailerYoutubeId,
    movieTitle: m.title,
    movie: {
      title: m.title,
      href: `/movie/${m.slug}`,
      poster: opts.img(m.poster, 200),
      year: m.year,
      genres: splitList(m.genres),
      runtimeMinutes: m.runtimeMinutes,
      isSeries,
      percent: computeBlendedPercent(m.ratings, m.tmdbVoteAverage, m.tmdbVoteCount),
      ratingCount: m.ratings.length,
      facts,
      cast: castNames.map((name) => {
        const p = byName.get(name);
        return { name, href: p ? `/osobnost/${p.slug}` : null, photo: p?.photo ? opts.img(p.photo, 80) : null };
      }),
      movieId: m.id,
      inWatchlist
    }
  };
}

// Najčítanejšie články daného typu za posledných 30 dní (bez aktuálneho).
// isMember: nečlenovia (a zdieľaná verzia) nesmú vidieť novinky, ktoré sú ešte len v 10-hodinovom predstihu pre Golden Ticket.
export async function loadMostRead(type: 'news' | 'blog', excludeId: string, img: ImgFn, label: string, isMember = false): Promise<ArticleCard[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const counts = await prisma.articleView.groupBy({
    by: ['targetId'],
    where: { targetType: type, createdAt: { gte: since } },
    _count: { targetId: true },
    orderBy: { _count: { targetId: 'desc' } },
    take: 8
  });
  const ids = counts.map((c) => c.targetId).filter((id) => id !== excludeId);
  if (!ids.length) return [];
  const order = new Map(ids.map((id, i) => [id, i]));
  if (type === 'news') {
    const rows = await prisma.newsPost.findMany({ where: { id: { in: ids }, ...publishedNewsFilterForMember(isMember) }, select: { id: true, title: true, slug: true, coverImage: true } });
    return rows
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .slice(0, 4)
      .map((r) => ({ key: r.id, title: r.title, href: `/news/${r.slug}`, image: img(r.coverImage, 80), label }));
  }
  const rows = await prisma.blogPost.findMany({ where: { id: { in: ids }, isDraft: false, published: true }, select: { id: true, title: true, coverImage: true } });
  return rows
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .slice(0, 4)
    .map((r) => ({ key: r.id, title: r.title, href: `/blog/${r.id}`, image: img(r.coverImage, 80), label }));
}

// „Mohlo by vás zajímat“ — najprv podľa štítkov, doplnené najnovšími.
export async function loadRelated(type: 'news' | 'blog', excludeId: string, tags: string[], img: ImgFn, label: string, isMember = false): Promise<ArticleCard[]> {
  if (type === 'news') {
    const sel = { id: true, title: true, slug: true, coverImage: true, body: true } as const;
    const byTags = tags.length
      ? await prisma.newsPost.findMany({ where: { id: { not: excludeId }, tags: { hasSome: tags }, ...publishedNewsFilterForMember(isMember) }, orderBy: { createdAt: 'desc' }, take: 4, select: sel })
      : [];
    const fill =
      byTags.length < 4
        ? await prisma.newsPost.findMany({
            where: { id: { notIn: [excludeId, ...byTags.map((b) => b.id)] }, ...publishedNewsFilterForMember(isMember) },
            orderBy: { createdAt: 'desc' },
            take: 4 - byTags.length,
            select: sel
          })
        : [];
    return [...byTags, ...fill].map((r) => ({ key: r.id, title: r.title, href: `/news/${r.slug}`, image: img(r.coverImage, 400), label, minutes: readingTime(r.body) }));
  }
  const sel = { id: true, title: true, coverImage: true, body: true } as const;
  const byTags = tags.length
    ? await prisma.blogPost.findMany({ where: { id: { not: excludeId }, tags: { hasSome: tags }, isDraft: false, published: true }, orderBy: { createdAt: 'desc' }, take: 4, select: sel })
    : [];
  const fill =
    byTags.length < 4
      ? await prisma.blogPost.findMany({
          where: { id: { notIn: [excludeId, ...byTags.map((b) => b.id)] }, isDraft: false, published: true },
          orderBy: { createdAt: 'desc' },
          take: 4 - byTags.length,
          select: sel
        })
      : [];
  return [...byTags, ...fill].map((r) => ({ key: r.id, title: r.title, href: `/blog/${r.id}`, image: img(r.coverImage, 400), label, minutes: readingTime(r.body) }));
}

// Štatistika autora do karty „Autor článku“.
export async function loadAuthorStats(authorId: string, labels: { reviews: string; articles: string }): Promise<string | null> {
  const [reviews, articles] = await Promise.all([
    prisma.review.count({ where: { authorId } }),
    prisma.newsPost.count({ where: { authorId, ...publishedNews() } })
  ]);
  const parts: string[] = [];
  if (reviews) parts.push(`${labels.reviews}: ${reviews}`);
  if (articles) parts.push(`${labels.articles}: ${articles}`);
  return parts.length ? parts.join(' · ') : null;
}

// Komentáre novinky pre zdieľanú verziu — len text, meno, avatar a počet palcov.
export async function loadReadOnlyComments(newsId: string, authorId: string, img: ImgFn, deletedUserLabel: string): Promise<{ comments: ReadOnlyCommentData[]; total: number }> {
  const rows = await prisma.comment.findMany({
    where: { newsId, parentId: null },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: {
      id: true,
      body: true,
      createdAt: true,
      userId: true,
      user: { select: { name: true, avatar: true } },
      likes: { where: { value: 1 }, select: { id: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, body: true, createdAt: true, userId: true, user: { select: { name: true, avatar: true } }, likes: { where: { value: 1 }, select: { id: true } } }
      }
    }
  });
  const map = (c: { id: string; body: string; createdAt: Date; userId: string; user: { name: string; avatar: string | null }; likes: { id: string }[] }) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    name: displayUserName(c.user.name, () => deletedUserLabel),
    avatar: img(c.user.avatar, 40),
    isAuthor: c.userId === authorId,
    likeCount: c.likes.length
  });
  const comments = rows
    .map((c) => ({ ...map(c), replies: c.replies.map((r) => ({ ...map(r), replies: [] })) }))
    .sort((a, b) => b.likeCount - a.likeCount || +new Date(b.createdAt) - +new Date(a.createdAt));
  const total = await prisma.comment.count({ where: { newsId } });
  return { comments, total };
}
