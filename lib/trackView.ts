import { prisma } from './prisma';

// Zaznamená jednu návštevu článku. Nikdy nezhodí vykresľovanie stránky, ak by
// zápis zlyhal — sledovanie návštevnosti je "vedľajšia" vec, nie kritická.
export async function trackArticleView(targetType: 'news' | 'blog', targetId: string) {
  await prisma.articleView.create({ data: { targetType, targetId } }).catch(() => {});
}
