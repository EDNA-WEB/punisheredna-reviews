import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';
import { tmdbGetMovieCastCrew, tmdbGetPersonDetails } from '@/lib/tmdb';
import { uploadImage } from '@/lib/cloudinary';

// Zaistí, že osoba s daným TMDb ID existuje u nás v databáze — ak áno, len
// vráti jej meno; ak nie, vytvorí nový (schválený) profil s fotkou, životopisom
// a dátumami, natiahnutými priamo z TMDb.
async function ensurePersonExists(tmdbId: number, fallbackName: string): Promise<string> {
  const existing = await prisma.person.findFirst({ where: { tmdbId } });
  if (existing) return existing.name;

  const details = await tmdbGetPersonDetails(tmdbId);
  const name = details.name || fallbackName;

  let photoUrl: string | null = details.photo;
  if (photoUrl) {
    try {
      photoUrl = await uploadImage(photoUrl, 'people');
    } catch {
      // ak sa fotku nepodarí prekopírovať, pokračujeme bez nej
    }
  }

  let slug = slugify(name) || 'osoba';
  let uniqueSlug = slug;
  let counter = 2;
  while (await prisma.person.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  await prisma.person.create({
    data: {
      name,
      slug: uniqueSlug,
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

  return name;
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Nemáš oprávnenie na túto akciu.' }, { status: 403 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: params.id } });
  if (!movie) return NextResponse.json({ error: 'Film sa nenašiel.' }, { status: 404 });
  if (!movie.tmdbId) {
    return NextResponse.json({ error: 'Tento film nemá prepojenie na TMDb, obsadenie sa nedá automaticky natiahnuť.' }, { status: 400 });
  }

  try {
    const creditsFromTmdb = await tmdbGetMovieCastCrew(movie.tmdbId);

    // Pre KAŽDÚ osobu (herci aj štáb) zaistíme profil u nás — nové osoby sa
    // vytvoria automaticky, existujúce sa len znovu použijú (žiadna duplicita).
    const [castNames, directorNames, screenplayNames, cinematographyNames, musicNames] = await Promise.all([
      Promise.all(creditsFromTmdb.cast.map((p) => ensurePersonExists(p.tmdbId, p.name))),
      Promise.all(creditsFromTmdb.director.map((p) => ensurePersonExists(p.tmdbId, p.name))),
      Promise.all(creditsFromTmdb.screenplay.map((p) => ensurePersonExists(p.tmdbId, p.name))),
      Promise.all(creditsFromTmdb.cinematography.map((p) => ensurePersonExists(p.tmdbId, p.name))),
      Promise.all(creditsFromTmdb.music.map((p) => ensurePersonExists(p.tmdbId, p.name)))
    ]);

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
    return NextResponse.json({ error: 'Natiahnutie obsadenia z TMDb zlyhalo. Skús to prosím znova.' }, { status: 500 });
  }
}
