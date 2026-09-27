import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

// Rovnaká logika ako web (app/osobnost/[slug]/page.tsx) — filmografia sa
// hľadá cez zhodu mena v textových poliach filmu (cast/director/atď.),
// keďže to nie je samostatná prepojovacia tabuľka.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Chýba slug.' }, { status: 400 });

    const person = await prisma.person.findUnique({
      where: { slug },
      include: { followers: true }
    });
    if (!person) return NextResponse.json({ error: 'Osoba se nenašla.' }, { status: 404 });

    let isFollowing = false;
    const me = await getMobileUser(req);
    if (me) isFollowing = person.followers.some((f) => f.userId === me.id);

    const movies =
      person.role === 'ACTOR'
        ? await prisma.movie.findMany({
            where: { cast: { contains: person.name, mode: 'insensitive' }, approved: true },
            orderBy: { year: 'desc' },
            select: { id: true, title: true, slug: true, year: true, poster: true, ratings: { select: { value: true } } }
          })
        : await prisma.movie.findMany({
            where: {
              approved: true,
              OR: [
                { director: { contains: person.name, mode: 'insensitive' } },
                { screenplay: { contains: person.name, mode: 'insensitive' } },
                { cinematography: { contains: person.name, mode: 'insensitive' } },
                { music: { contains: person.name, mode: 'insensitive' } }
              ]
            },
            orderBy: { year: 'desc' },
            select: { id: true, title: true, slug: true, year: true, poster: true, ratings: { select: { value: true } } }
          });

    const movieList = movies.map((m) => {
      const avg = m.ratings.length > 0 ? m.ratings.reduce((s, r) => s + r.value, 0) / m.ratings.length : null;
      const { ratings, ...rest } = m;
      return { ...rest, averageRating: avg };
    });

    return NextResponse.json(
      {
        id: person.id,
        name: person.name,
        slug: person.slug,
        photo: person.photo,
        bio: person.bio,
        role: person.role,
        birthDate: person.birthDate,
        deathDate: person.deathDate,
        birthPlace: person.birthPlace,
        deathPlace: person.deathPlace,
        followersCount: person.followers.length,
        isFollowing,
        movies: movieList
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/person-profile]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
