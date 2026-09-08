import { prisma } from '@/lib/prisma';
import { tmdbGetPersonFilmography } from '@/lib/tmdb';

export type FilmographyItem = {
  tmdbId: number;
  title: string;
  year: string;
  poster: string | null;
  roleLabel: string | null;
  ourSlug: string | null;
};
export type FilmographyCategory = { key: string; label: string; items: FilmographyItem[] };

// Zoskupenie pracovných pozícií z TMDb (v angličtine) do zrozumiteľných
// slovenských kategórií na záložkách — namiesto desiatok drobných variácií
// (Director, Co-Director, Executive Producer...) len pár prehľadných skupín.
const JOB_GROUPS: { label: string; match: (job: string) => boolean }[] = [
  { label: 'Réžia', match: (j) => /director/i.test(j) && !/photography|casting/i.test(j) },
  { label: 'Scenár', match: (j) => /writer|screenplay|story/i.test(j) },
  { label: 'Produkcia', match: (j) => /producer/i.test(j) }
];

export async function prepareFilmographyCategories(tmdbId: number, role: 'ACTOR' | 'CREATOR'): Promise<FilmographyCategory[]> {
  const { asActor, asCrew } = await tmdbGetPersonFilmography(tmdbId);

  const allTmdbIds = [...asActor, ...asCrew].map((item) => item.tmdbId).filter(Boolean);
  const ourMovies = await prisma.movie.findMany({
    where: { tmdbId: { in: allTmdbIds }, approved: true },
    select: { tmdbId: true, slug: true }
  });
  const slugByTmdbId = new Map(ourMovies.map((m) => [m.tmdbId, m.slug]));

  const toFilmItem = (item: any, roleLabel: string | null): FilmographyItem => ({
    tmdbId: item.tmdbId,
    title: item.title,
    year: item.year,
    poster: item.poster,
    roleLabel,
    ourSlug: slugByTmdbId.get(item.tmdbId) || null
  });

  const actingItems = asActor.map((item) => toFilmItem(item, item.character));

  const otherCrewItems: FilmographyItem[] = [];
  const groupedCrew = new Map<string, FilmographyItem[]>();
  for (const item of asCrew) {
    const job = item.job || '';
    const group = JOB_GROUPS.find((g) => g.match(job));
    const entry = toFilmItem(item, job || null);
    if (group) {
      if (!groupedCrew.has(group.label)) groupedCrew.set(group.label, []);
      groupedCrew.get(group.label)!.push(entry);
    } else {
      otherCrewItems.push(entry);
    }
  }

  const categories: FilmographyCategory[] = [
    { key: 'acting', label: 'Herectvo', items: actingItems },
    ...JOB_GROUPS.map((g) => ({ key: g.label, label: g.label, items: groupedCrew.get(g.label) || [] })),
    { key: 'ostatne', label: 'Ostatné', items: otherCrewItems }
  ];

  return role === 'ACTOR' ? categories : [...categories.slice(1), categories[0]];
}
