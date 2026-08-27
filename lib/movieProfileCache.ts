import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

// Toto je JEDINÝ, najdrahší dopyt na profile filmu (recenzie + lajky + komentáre +
// ich odpovede). Dáta v ňom sú rovnaké pre KAŽDÉHO návštevníka — osobné veci (moje
// hodnotenie, "chcem vidieť", či sa mi táto recenzia páči) sa dopočítavajú AŽ POTOM,
// z viewerId, takže cachovanie tohto dopytu nič neprezradí ani neskreslí.
//
// Vďaka tomu sa databáza pri opakovaných návštevách toho istého filmu vôbec
// nepýta znova — až kým cache nevyprší (60 s), alebo kým ju niekto výslovne
// nezneplatní (napr. po pridaní novej recenzie cez revalidateMovieProfile nižšie).
export async function getCachedMovieProfile(slug: string) {
  return unstable_cache(
    async () => {
      return prisma.movie.findUnique({
        where: { slug },
        include: {
          ratings: { where: { seasonId: null, episodeId: null } },
          photos: {
            where: { episodeId: null },
            orderBy: { order: 'asc' },
            select: { id: true, thumbnail: true }
          },
          reviews: {
            where: { seasonId: null, episodeId: null },
            include: {
              author: { select: { id: true, name: true, avatar: true, role: true } },
              likes: true,
              comments: {
                where: { parentId: null },
                orderBy: { createdAt: 'asc' },
                include: {
                  user: { select: { name: true, role: true, avatar: true } },
                  likes: true,
                  replies: {
                    orderBy: { createdAt: 'asc' },
                    include: { user: { select: { name: true, role: true, avatar: true } }, likes: true }
                  }
                }
              }
            }
          }
        }
      });
    },
    [`movie-profile-${slug}`],
    { tags: [`movie-${slug}`], revalidate: 60 }
  )();
}
