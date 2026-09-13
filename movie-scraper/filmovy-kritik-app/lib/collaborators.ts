import { prisma } from '@/lib/prisma';

export type Collaborator = { id: string; name: string; slug: string; photo: string | null; role: string; count: number };

// Zisťuje, s ktorými osobami daný herec/tvorca najčastejšie účinkuje spolu — na
// základe NAŠEJ vlastnej (kurátorovanej) databázy filmov, nie generických
// štatistík naprieč tisíckami bezvýznamných vedľajších rolí. Práve preto sú
// výsledky relevantnejšie než to, čo bežne ukazujú veľké filmové databázy.
export async function findFrequentCollaborators(
  personName: string,
  movieIds: string[],
  excludePersonId: string,
  limit = 8
): Promise<Collaborator[]> {
  if (movieIds.length === 0) return [];

  const movies = await prisma.movie.findMany({
    where: { id: { in: movieIds } },
    select: { cast: true, director: true, screenplay: true, cinematography: true, music: true }
  });

  const nameCounts = new Map<string, number>();
  const normalizedSelf = personName.trim().toLowerCase();

  for (const movie of movies) {
    const allNames = [
      ...(movie.cast || '').split(','),
      ...(movie.director || '').split(','),
      ...(movie.screenplay || '').split(','),
      ...(movie.cinematography || '').split(','),
      ...(movie.music || '').split(',')
    ]
      .map((n) => n.trim())
      .filter(Boolean);

    // Jedna osoba sa v tom istom filme počíta len raz (napr. keď je aj hercom
    // aj režisérom), nech si sama seba neduplicitne nepridáva do počtu.
    const uniqueInThisMovie = new Set(allNames.map((n) => n.toLowerCase()));
    for (const nameLower of uniqueInThisMovie) {
      if (nameLower === normalizedSelf) continue;
      const original = allNames.find((n) => n.toLowerCase() === nameLower)!;
      nameCounts.set(original, (nameCounts.get(original) || 0) + 1);
    }
  }

  const topNames = Array.from(nameCounts.entries())
    .filter(([, count]) => count >= 2) // aspoň 2 spoločné filmy, nech to nie je náhoda
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit * 2) // trochu rezervy, keďže nie všetky mená budú mať vlastný profil u nás
    .map(([name]) => name);

  if (topNames.length === 0) return [];

  const matchedPeople = await prisma.person.findMany({
    where: { name: { in: topNames }, approved: true, id: { not: excludePersonId } },
    select: { id: true, name: true, slug: true, photo: true, role: true }
  });

  return matchedPeople
    .map((p) => ({ ...p, count: nameCounts.get(p.name) || 0, role: p.role === 'ACTOR' ? 'Herec/herečka' : 'Tvorca' }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
