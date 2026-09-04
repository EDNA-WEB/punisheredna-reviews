import { prisma } from '@/lib/prisma';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import PremieresCarousel from './PremieresCarousel';

export default async function PremieresList() {
  const t = (await getDictionary(await getUserLanguage()));
  const premieres = await prisma.moviePremiereDate.findMany({
    where: { releaseDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, type: { not: 'VOD' } },
    orderBy: { releaseDate: 'asc' },
    take: 8,
    include: { movie: { select: { title: true, slug: true, poster: true, genres: true } } }
  });

  if (premieres.length === 0) return null;

  return (
    <div className="border border-line rounded-xl overflow-hidden bg-card h-full">
      <div className="px-4 py-3 flex items-center gap-2 bg-gradient-to-r from-night to-night/90">
        <span className="relative flex h-2 w-2 flex-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
        </span>
        <h3 className="font-display font-bold text-sm text-white">{t['home.v_kinach_coskoro'] || 'V kinách čoskoro'}</h3>
      </div>

      <PremieresCarousel premieres={premieres} />
    </div>
  );
}
