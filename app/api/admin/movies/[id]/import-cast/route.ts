import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';
import { tmdbGetMovieCastCrew, tmdbGetPersonDetails } from '@/lib/tmdb';

// Zaistí, že osoby s danými TMDb ID existujú u nás v databáze. Existujúce
// nájde JEDNÝM dopytom (predtým jeden dopyt na každú osobu cez celú tabuľku),
// nové vytvorí (schválený profil s fotkou, životopisom a dátumami z TMDb).
async function ensurePeople(people: Array<{ tmdbId: number; name: string }>): Promise<Map<number, string>> {
  const ids = Array.from(new Set(people.map((p) => p.tmdbId)));
  const names = new Map<number, string>();
  if (ids.length === 0) return names;

  const existing = await prisma.person.findMany({ where: { tmdbId: { in: ids } }, select: { tmdbId: true, name: true } });
  for (const e of existing) if (e.tmdbId !== null) names.set(e.tmdbId, e.name);

  const missing = ids.filter((id) => !names.has(id));
  for (const tmdbId of missing) {
    const fallbackName = people.find((p) => p.tmdbId === tmdbId)?.name || 'Osoba';
    const details = await tmdbGetPersonDetails(tmdbId);
    const name = details.name || fallbackName;

    // TMDb fotky sú na ich trvalom CDN — netreba ich kopírovať do Cloudinary.
    const photoUrl: string | null = details.photo;

    // Voľný slug — jeden dopyt na všetky obsadené varianty
    const base = slugify(name) || 'osoba';
    const taken = new Set(
      (await prisma.person.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((p) => p.slug)
    );
    let slug = base;
    let counter = 2;
    while (taken.has(slug)) slug = `${base}-${counter++}`;

    try {
      await prisma.person.create({
        data: {
          name,
          slug,
          role: details.role === 'CREATOR' ? 'CREATOR' : 'ACTOR',
          photo: photoUrl,
          bio: details.bio || null,
          birthDate: details.birthDate ? new Date(details.birthDate) : null,
          deathDate: details.deathDate ? new Date(details.deathDate) : null,
          birthPlace: details.birthPlace || null,
          tmdbId,
          approved: true
        }
      });
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e; // súbežne vytvorené — nevadí
    }
    names.set(tmdbId, name);
  }
  return names;
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { params } = { ...ctx, params: await ctx.params };
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnění k této akci.' }, { status: 403 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: params.id } });
  if (!movie) return NextResponse.json({ error: 'Film se nenašel.' }, { status: 404 });
  if (!movie.tmdbId) {
    return NextResponse.json({ error: 'Tento film nemá propojení s TMDb, obsazení se nedá automaticky načíst.' }, { status: 400 });
  }

  try {
    const creditsFromTmdb = await tmdbGetMovieCastCrew(movie.tmdbId);

    // Pre KAŽDÚ osobu (herci aj štáb) zaistíme profil u nás — nové osoby sa
    // vytvoria automaticky, existujúce sa len znovu použijú (žiadna duplicita).
    const all = [
      ...creditsFromTmdb.cast,
      ...creditsFromTmdb.director,
      ...creditsFromTmdb.screenplay,
      ...creditsFromTmdb.cinematography,
      ...creditsFromTmdb.music
    ];
    const names = await ensurePeople(all);
    const pick = (list: Array<{ tmdbId: number; name: string }>) => list.map((p) => names.get(p.tmdbId) || p.name);
    const castNames = pick(creditsFromTmdb.cast);
    const directorNames = pick(creditsFromTmdb.director);
    const screenplayNames = pick(creditsFromTmdb.screenplay);
    const cinematographyNames = pick(creditsFromTmdb.cinematography);
    const musicNames = pick(creditsFromTmdb.music);

    const updateData = {
      cast: castNames.join(', ') || null,
      director: directorNames.join(', ') || null,
      screenplay: screenplayNames.join(', ') || null,
      cinematography: cinematographyNames.join(', ') || null,
      music: musicNames.join(', ') || null
    };

    await prisma.movie.update({ where: { id: movie.id }, data: updateData });

    return NextResponse.json({ ...updateData, importedCount: castNames.length + directorNames.length + screenplayNames.length + cinematographyNames.length + musicNames.length });
  } catch (err: any) {
    console.error('[import-cast]', err);
    return NextResponse.json({ error: 'Načtení obsazení z TMDb se nezdařilo. Zkus to prosím znovu.' }, { status: 500 });
  }
}
