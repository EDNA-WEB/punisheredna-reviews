import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

// Zoznam žánrov s počtami — jeden dopyt na celú filmotéku (len pole "genres"),
// žiadne osobné dáta, žiadne parametre. Najjednoduchší možný prípad na
// cachovanie — 15 minút, keďže noví filmy pribúdajú len príležitostne.
export const getCachedGenreCounts = unstable_cache(
  async () => {
    const movies = await prisma.movie.findMany({ select: { genres: true } });
    const counts = new Map<string, number>();
    for (const m of movies) {
      (m.genres || '')
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)
        .forEach((g) => counts.set(g, (counts.get(g) || 0) + 1));
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  },
  ['genre-counts'],
  { revalidate: 900 }
);

// Kategórie obchodu s počtami produktov — malý, bezpečne cachovateľný dopyt.
export const getCachedShopCategories = unstable_cache(
  async () => {
    return prisma.shopCategory.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { products: { where: { approved: true } } } } }
    });
  },
  ['shop-categories'],
  { revalidate: 900 }
);

// Produkty obchodu — cachujeme podľa KATEGÓRIE (malá, ohraničená množina
// hodnôt), nie podľa cenového rozsahu (ten by mohol vytvoriť neobmedzene
// veľa rôznych kombinácií v cache). Filtrovanie podľa ceny a triedenie sa
// preto rieši až v pamäti nad týmto cachovaným zoznamom, priamo na stránke.
export const getCachedShopProducts = unstable_cache(
  async (categoryId: string | null) => {
    return prisma.shopProduct.findMany({
      where: { approved: true, ...(categoryId ? { categoryId } : {}) },
      include: { variants: { orderBy: { price: 'asc' }, take: 1 }, category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
  },
  ['shop-products'],
  { revalidate: 900 }
);

// Zoznamy hercov/tvorcov zoradené podľa sledovateľov — žiadne osobné dáta,
// žiadne parametre. Zmena poradia (nový sledovateľ) sa prejaví do 15 minút,
// čo je pri takomto rebríčku bezpečný kompromis.
export const getCachedActors = unstable_cache(
  async () => {
    return prisma.person.findMany({
      where: { role: 'ACTOR', approved: true },
      orderBy: { followers: { _count: 'desc' } },
      include: { _count: { select: { followers: true } } }
    });
  },
  ['actors-list'],
  { revalidate: 900 }
);

export const getCachedCreators = unstable_cache(
  async () => {
    return prisma.person.findMany({
      where: { role: 'CREATOR', approved: true },
      orderBy: { followers: { _count: 'desc' } },
      include: { _count: { select: { followers: true } } }
    });
  },
  ['creators-list'],
  { revalidate: 900 }
);

// Zoznam osôb na pokročilé vyhľadávanie — cachujeme CELÝ zoznam (bez filtrov),
// filtrovanie (typ, miesto narodenia/úmrtia, roky, bio) sa rieši až v pamäti
// nad týmto zoznamom, keďže kombinácií filtrov by mohlo byť príliš veľa na
// to, aby malo zmysel cachovať každú zvlášť.
export const getCachedAllPeople = unstable_cache(
  async () => {
    return prisma.person.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { followers: true } } }
    });
  },
  ['all-people'],
  { revalidate: 900 }
);

// Rebríček používateľov (podľa aktivity/karmy) — jedna z výpočtovo
// najnáročnejších stránok webu (5 dopytov vrátane počítania karmy naprieč
// celým webom). Triedenie (aktivita/karma) sa rieši až v pamäti nad týmito
// dátami, takže obe varianty zdieľajú ten istý cache záznam.
export const getCachedUserRankings = unstable_cache(
  async () => {
    const users = await prisma.user.findMany({
      where: { banned: false, deleted: false, email: { not: 'system@internal.punisheredna' } },
      include: { _count: { select: { comments: true, posts: true, threads: true, reviews: true } } }
    });

    const [reviewLikes, commentLikes, postLikes, newsLikes] = await Promise.all([
      prisma.like.findMany({ where: { reviewId: { not: null } }, select: { value: true, review: { select: { authorId: true } } } }),
      prisma.like.findMany({ where: { commentId: { not: null } }, select: { value: true, comment: { select: { userId: true } } } }),
      prisma.like.findMany({ where: { postId: { not: null } }, select: { value: true, post: { select: { authorId: true } } } }),
      prisma.like.findMany({ where: { newsId: { not: null } }, select: { value: true, news: { select: { authorId: true } } } })
    ]);

    const karmaByUserId = new Map<string, number>();
    const addKarma = (userId: string | undefined, value: number) => {
      if (!userId) return;
      karmaByUserId.set(userId, (karmaByUserId.get(userId) || 0) + value);
    };
    reviewLikes.forEach((l) => addKarma(l.review?.authorId, l.value));
    commentLikes.forEach((l) => addKarma(l.comment?.userId, l.value));
    postLikes.forEach((l) => addKarma(l.post?.authorId, l.value));
    newsLikes.forEach((l) => addKarma(l.news?.authorId, l.value));

    return users.map((u) => {
      const karma = karmaByUserId.get(u.id) || 0;
      const total = u._count.comments + u._count.posts + u._count.threads + u._count.reviews;
      return { ...u, karma, total };
    });
  },
  ['user-rankings'],
  { revalidate: 900 }
);
