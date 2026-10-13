import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileUser } from '@/lib/mobileAuth';
import { tmdbGetPersonPopularity, tmdbGetPersonImages, tmdbGetPersonFilmography } from '@/lib/tmdb';
import { prepareFilmographyCategories } from '@/lib/personFilmography';
import { loadPersonExtras } from '@/lib/personExtras';
import { isActiveMember } from '@/lib/membership';
import { buildCareerMilestones } from '@/lib/careerMilestones';
import { visibleFanFilter } from '@/lib/personData';

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
    // Neschválenú osobnosť vidí len ten, kto ju pridal, a admin (ako na webe)
    if (!person.approved && person.submittedById !== me?.id && me?.role !== 'ADMIN') return NextResponse.json({ error: 'Osoba se nenašla.' }, { status: 404 });
    if (me) isFollowing = person.followers.some((f) => f.userId === me.id);

    // Prvé dve profilovky fanúšikov z nášho webu (nie z TMDb) — len tí, čo obľúbené neskrývajú.
    const fanAvatars = await prisma.user.findMany({
      where: { id: { in: person.followers.map((f) => f.userId) }, ...visibleFanFilter(me?.id || null) },
      take: 2,
      select: { avatar: true }
    });

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

    // Doplnky pre nový vzhľad profilu v appke (staršia appka ich ignoruje)
    const categories = person.tmdbId ? await prepareFilmographyCategories(person.tmdbId, person.role).catch(() => null) : null;
    const viewerIsMember = !!me && (me.role === 'ADMIN' || (await isActiveMember(me.id)));
    const extras = await loadPersonExtras({
      person: { id: person.id, name: person.name, role: person.role, birthDate: person.birthDate, deathDate: person.deathDate },
      categories,
      viewerId: me?.id || null,
      viewerIsMember
    }).catch((e) => {
      console.error('[personExtras]', e);
      return null;
    });

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
        filmographyByYear,
        subRole: person.subRole,
        extras
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/mobile/person-profile]', error);
    return NextResponse.json({ error: 'Chyba při načítání.' }, { status: 500 });
  }
}
