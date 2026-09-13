import { prisma } from '@/lib/prisma';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import PremieresCarousel from './PremieresCarousel';

export default async function PremieresList() {
  const t = (await getDictionary(await getUserLanguage()));
  const rows = await prisma.moviePremiereDate.findMany({
    where: { releaseDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, type: { not: 'VOD' } },
    orderBy: { releaseDate: 'asc' },
    include: { movie: { select: { id: true, title: true, slug: true, poster: true, genres: true } } }
  });

  // Jeden film môže mať viac dátumov premiéry (napr. rôzne krajiny) — zobrazíme
  // ho len raz, s tou najbližšou nadchádzajúcou premiérou.
  const seenMovies = new Set<string>();
  const premieres = [];
  for (const row of rows) {
    if (seenMovies.has(row.movie.id)) continue;
    seenMovies.add(row.movie.id);
    premieres.push(row);
    if (premieres.length >= 8) break;
  }

  if (premieres.length === 0) return null;

  return (
    <div className="border border-line rounded-xl overflow-hidden bg-card">
      <div className="px-4 py-3 bg-surface border-b border-line">
        <h3 className="font-display font-bold text-sm text-ink">{t['home.v_kinach_coskoro'] || 'V kinách čoskoro'}</h3>
      </div>

      <PremieresCarousel premieres={premieres} />
    </div>
  );
}
