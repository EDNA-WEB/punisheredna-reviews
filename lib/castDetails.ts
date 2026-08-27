import { prisma } from './prisma';
import { computePercent } from './rating';

export type CastDetail = {
  name: string;
  slug: string | null;
  photo: string | null;
  birthPlace: string | null;
  topMovies: { title: string; slug: string; year: string | null; contentType: string; percent: number | null }[];
};

// Pre zoznam hercov vráti fotku, miesto pôvodu a ich top 3 najlepšie hodnotené filmy —
// v presne DVOCH dopytoch celkovo, bez ohľadu na to, koľko hercov film má
// (predtým to boli 2 dopyty PRE KAŽDÉHO herca zvlášť — pri 10 hercoch 20 dopytov).
export async function getCastDetails(cast: string[]): Promise<CastDetail[]> {
  if (cast.length === 0) return [];

  const [people, castMovies] = await Promise.all([
    prisma.person.findMany({
      where: { name: { in: cast } },
      select: { name: true, slug: true, photo: true, birthPlace: true }
    }),
    prisma.movie.findMany({
      where: {
        approved: true,
        OR: cast.map((name) => ({ cast: { contains: name, mode: 'insensitive' as const } }))
      },
      select: { title: true, slug: true, year: true, contentType: true, cast: true, ratings: { select: { value: true } } }
    })
  ]);

  const personByName = new Map(people.map((p) => [p.name, p]));

  return cast.map((name) => {
    const person = personByName.get(name);
    const lowerName = name.toLowerCase();
    const topMovies = castMovies
      .filter((m) => (m.cast || '').toLowerCase().includes(lowerName))
      .map((m) => ({ title: m.title, slug: m.slug, year: m.year, contentType: m.contentType, percent: computePercent(m.ratings) }))
      .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1))
      .slice(0, 3);
    return { name, slug: person?.slug || null, photo: person?.photo || null, birthPlace: person?.birthPlace || null, topMovies };
  });
}
