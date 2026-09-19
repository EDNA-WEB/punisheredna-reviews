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
