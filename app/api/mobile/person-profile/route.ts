import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { tmdbGetPersonPopularity, tmdbGetPersonImages, tmdbGetPersonFilmography } from '@/lib/tmdb';
import { buildCareerMilestones } from '@/lib/careerMilestones';

export const dynamic = 'force-dynamic';

// Presne pass-through prekladač — appka texty prekladá sama (alebo
// zatiaľ nechá po česky), tak stačí vždy vrátiť fallback.
const passthroughT = (key: string, fallback?: string) => fallback || key;

function calculateAge(birth: Date, until: Date | null) {
  const end = until || new Date();
  let age = end.getFullYear() - birth.getFullYear();
  if (end.getMonth() < birth.getMonth() || (end.getMonth() === birth.getMonth() && end.getDate() < birth.getDate())) age--;
  return age;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Chýba slug.' }, { status: 400 });

    const person = await prisma.person.findUnique({ where: { slug }, include: { followers: true } });
    if (!person) return NextResponse.json({ error: 'Osoba se nenašla.' }, { status: 404 });

    let isFollowing = false;
    const me = await getMobileUser(req);
    if (me) isFollowing = person.followers.some((f) => f.userId === me.id);

    // Prvé dve profilovky náhodných fanúšikov z nášho webu (nie z TMDb).
    const fanPreview = person.followers.slice(0, 2);
    const fanAvatars = await prisma.user.findMany({ where: { id: { in: fanPreview.map((f) => f.userId) } }, select: { avatar: true } });

    let popularity: number | null = null;
    let photos: string[] = [];
    let milestones: any[] = [];
    let filmographyByYear: any[] = [];

    if (person.tmdbId) {
      const [pop, imgs, ms, { asActor, asCrew }] = await Promise.all([
        tmdbGetPersonPopularity(person.tmdbId),
        tmdbGetPersonImages(person.tmdbId),
        buildCareerMilestones(person.tmdbId, person.role, passthroughT, person.birthDate ? new Date(person.birthDate).getFullYear() : null),
        tmdbGetPersonFilmography(person.tmdbId)
      ]);
      popularity = pop;
      photos = imgs;
      milestones = ms;
      const combined = person.role === 'ACTOR' && asActor.length > 0 ? asActor : [...asActor, ...asCrew];
      filmographyByYear = combined
        .filter((m: any) => m.mediaType === 'movie' && m.year)
        .map((m: any) => ({
          tmdbId: m.tmdbId,
          title: m.title,
          year: m.year,
          poster: m.backdropPoster || m.poster,
          rating: typeof m.voteAverage === 'number' ? m.voteAverage / 2 : null
        }));
    }

    const age = person.birthDate ? calculateAge(new Date(person.birthDate), person.deathDate ? new Date(person.deathDate) : null) : null;

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
        age,
        followersCount: person.followers.length,
        fanAvatars: fanAvatars.map((f) => f.avatar),
        isFollowing,
        popularity,
        photos,
        milestones,
        filmographyByYear
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/person-profile]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
