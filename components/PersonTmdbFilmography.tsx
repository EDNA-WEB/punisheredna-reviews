import { prisma } from '@/lib/prisma';
import { tmdbGetPersonFilmography } from '@/lib/tmdb';
import PersonFilmographyTabs from './PersonFilmographyTabs';

// Zoskupenie pracovných pozícií z TMDb (v angličtine) do zrozumiteľných
// slovenských kategórií na záložkách — namiesto desiatok drobných variácií
// (Director, Co-Director, Executive Producer...) len pár prehľadných skupín.
const JOB_GROUPS: { label: string; match: (job: string) => boolean }[] = [
  { label: 'Réžia', match: (j) => /director/i.test(j) && !/photography|casting/i.test(j) },
  { label: 'Scenár', match: (j) => /writer|screenplay|story/i.test(j) },
  { label: 'Produkcia', match: (j) => /producer/i.test(j) }
];

export default async function PersonTmdbFilmography({ tmdbId, role }: { tmdbId: number; role: 'ACTOR' | 'CREATOR' }) {
  const { asActor, asCrew } = await tmdbGetPersonFilmography(tmdbId);

  const allTmdbIds = [...asActor, ...asCrew].map((item) => item.tmdbId).filter(Boolean);
  const ourMovies = await prisma.movie.findMany({
    where: { tmdbId: { in: allTmdbIds }, approved: true },
    select: { tmdbId: true, slug: true }
  });
  const slugByTmdbId = new Map(ourMovies.map((m) => [m.tmdbId, m.slug]));

  const toFilmItem = (item: any, roleLabel: string | null) => ({
    tmdbId: item.tmdbId,
    title: item.title,
    year: item.year,
    poster: item.poster,
    roleLabel,
    ourSlug: slugByTmdbId.get(item.tmdbId) || null
  });

  const actingItems = asActor.map((item) => toFilmItem(item, item.character));

  const otherCrewItems: ReturnType<typeof toFilmItem>[] = [];
  const groupedCrew = new Map<string, ReturnType<typeof toFilmItem>[]>();
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

  const categories = [
    { key: 'acting', label: 'Herectvo', items: actingItems },
    ...JOB_GROUPS.map((g) => ({ key: g.label, label: g.label, items: groupedCrew.get(g.label) || [] })),
    { key: 'ostatne', label: 'Ostatné', items: otherCrewItems }
  ];

  // Poradie záložiek podľa hlavnej role osoby — u herca ide herectvo prvé,
  // u tvorcu (režisér a pod.) ide filmografia za kamerou prvá.
  const ordered = role === 'ACTOR' ? categories : [...categories.slice(1), categories[0]];

  if (ordered.every((c) => c.items.length === 0)) return null;

  return <PersonFilmographyTabs categories={ordered} />;
}
