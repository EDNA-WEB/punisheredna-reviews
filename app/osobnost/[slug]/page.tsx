import { prisma } from '@/lib/prisma';
import { publishedNewsFilterForMember } from '@/lib/publishedFilter';
import { personJsonLd } from '@/lib/jsonLd';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PersonHero from '@/components/person/PersonHero';
import PersonTabs from '@/components/person/PersonTabs';
import PersonSidebar from '@/components/person/PersonSidebar';
import { calculateAge } from '@/lib/personUtils';
import { computeBlendedPercent } from '@/lib/rating';
import { careerStats, creatorJob, filmographyYears, genreShare, visibleFanFilter } from '@/lib/personData';
import { sharpImage } from '@/lib/imageQuality';
import { prepareFilmographyCategories } from '@/lib/personFilmography';
import { tmdbGetPersonImages, tmdbGetPersonPopularity, tmdbGetPersonExternalIds } from '@/lib/tmdb';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { findFrequentCollaborators } from '@/lib/collaborators';
import { buildCareerMilestones } from '@/lib/careerMilestones';
import { isActiveMember } from '@/lib/membership';
import CareerTimelineModal from '@/components/CareerTimelineModal';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

import { headers } from 'next/headers';
export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { params } = { ...props, params: await props.params };
  const person = await prisma.person.findUnique({ where: { slug: params.slug }, select: { name: true, bio: true, photo: true, role: true } });
  if (!person) return {};
  const description = person.bio
    ? person.bio.slice(0, 160)
    : `Filmografie, fotky a informace o osobě ${person.name} na KrálFilmu.cz.`;
  return {
    title: person.name,
    description,
    openGraph: { title: person.name, description, images: person.photo ? [{ url: person.photo }] : undefined, type: 'profile' }
  };
}

export default async function PersonPage(props: { params: Promise<{ slug: string }> }) {
  const { params } = { ...props, params: await props.params };
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isMember = isAdmin || (await isActiveMember(viewerId));

  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string, fallback?: string) => dict[key] || fallback || key;

  const person = await prisma.person.findUnique({
    where: { slug: params.slug },
    include: { _count: { select: { followers: true } } }
  });
  if (!person) return notFound();
  if (!person.approved && person.submittedById !== viewerId && !isAdmin) return notFound();

  const isFollowing = viewerId
    ? !!(await prisma.personFollow.findUnique({ where: { userId_personId: { userId: viewerId, personId: person.id } }, select: { id: true } }))
    : false;

  const movies =
    person.role === 'ACTOR'
      ? await prisma.movie.findMany({
          where: { cast: { contains: person.name, mode: 'insensitive' } },
          orderBy: { year: 'desc' },
          select: { id: true, title: true, slug: true, year: true, poster: true, genres: true, director: true, screenplay: true, cinematography: true, music: true, tmdbVoteAverage: true, tmdbVoteCount: true, ratings: { where: { seasonId: null, episodeId: null }, select: { value: true } } }
        })
      : await prisma.movie.findMany({
          where: {
            OR: [
              { director: { contains: person.name, mode: 'insensitive' } },
              { screenplay: { contains: person.name, mode: 'insensitive' } },
              { cinematography: { contains: person.name, mode: 'insensitive' } },
              { music: { contains: person.name, mode: 'insensitive' } }
            ]
          },
          orderBy: { year: 'desc' },
          select: { id: true, title: true, slug: true, year: true, poster: true, genres: true, director: true, screenplay: true, cinematography: true, music: true, tmdbVoteAverage: true, tmdbVoteCount: true, ratings: { where: { seasonId: null, episodeId: null }, select: { value: true } } }
        });

  const movieIds = movies.map((m) => m.id);
  const [relatedNews, filmographyCategories, photos, popularity, externalLinks, frequentCollaborators, careerMilestones] = await Promise.all([
    movieIds.length
      ? prisma.newsPost.findMany({
          where: { movieId: { in: movieIds }, ...publishedNewsFilterForMember(isMember) },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { title: true, slug: true, coverImage: true, movie: { select: { title: true } } }
        })
      : Promise.resolve([]),
    person.tmdbId ? prepareFilmographyCategories(person.tmdbId, person.role) : Promise.resolve(null),
    person.tmdbId ? tmdbGetPersonImages(person.tmdbId) : Promise.resolve([]),
    person.tmdbId ? tmdbGetPersonPopularity(person.tmdbId) : Promise.resolve(null),
    person.tmdbId ? tmdbGetPersonExternalIds(person.tmdbId) : Promise.resolve(null),
    findFrequentCollaborators(person.name, movieIds, person.id),
    person.tmdbId ? buildCareerMilestones(person.tmdbId, person.role, t, person.birthDate ? new Date(person.birthDate).getFullYear() : null) : Promise.resolve([])
  ]);

  const isDead = !!person.deathDate;
  const countryFlag = getCountryFlagUrl(person.birthPlace);
  const age = person.birthDate ? calculateAge(new Date(person.birthDate), person.deathDate ? new Date(person.deathDate) : null) : null;
  const sharp = (url: string | null | undefined, w: number) => (url ? sharpImage(url, w) || url : null);
  const fmtDate = (d: Date) => new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });

  // Aktívne obdobie — z CELEJ TMDb filmografie; roky pred narodením (archívne
  // zábery, chybné záznamy) sa vyradia.
  const earliestPossibleYear = person.birthDate ? new Date(person.birthDate).getFullYear() : 1888;
  const allTitles = filmographyYears(filmographyCategories, earliestPossibleYear);
  const allFilmographyYears = allTitles.map((x) => x.year);
  const careerSpan =
    allFilmographyYears.length > 0
      ? `${Math.min(...allFilmographyYears)}–${isDead ? new Date(person.deathDate!).getFullYear() : t('person.sucasnost', 'současnost')}`
      : null;

  // Rola herca (postava z TMDb) / funkcia tvorcu pri filme u nás
  const characterBySlug = new Map<string, string>();
  for (const c of filmographyCategories || []) {
    if (person.role === 'ACTOR' && c.key !== 'acting') continue;
    for (const it of c.items) if (it.ourSlug && it.roleLabel && !characterBySlug.has(it.ourSlug)) characterBySlug.set(it.ourSlug, it.roleLabel);
  }
  const jobLabels = {
    director: t('osoba.rezie', 'Režie'),
    screenplay: t('osoba.scenar', 'Scénář'),
    cinematography: t('osoba.kamera', 'Kamera'),
    music: t('osoba.hudba', 'Hudba')
  };
  const ourMovies = movies
    .map((m) => ({
      slug: m.slug,
      title: m.title,
      year: m.year,
      poster: sharp(m.poster, 120),
      percent: computeBlendedPercent(m.ratings, m.tmdbVoteAverage, m.tmdbVoteCount),
      roleLabel: person.role === 'ACTOR' ? characterBySlug.get(m.slug) || null : creatorJob(person.name, m, jobLabels),
      genres: m.genres,
      ratings: m.ratings
    }))
    .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));

  const rated = ourMovies.filter((m) => m.percent !== null);
  const avgPercent = rated.length ? Math.round(rated.reduce((n, m) => n + (m.percent || 0), 0) / rated.length) : null;
  const top = rated[0] || null;
  const career = careerStats(filmographyCategories, movies, earliestPossibleYear);
  const genres = genreShare(movies, 5);

  // Fanúšikovia (používatelia, ktorí majú osobu v obľúbených) + tí, ktorých sleduješ
  const [fanRows, mutualRows, mutualCount] = await Promise.all([
    prisma.personFollow.findMany({
      where: { personId: person.id, user: visibleFanFilter(viewerId) },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { user: { select: { id: true, name: true, avatar: true } } }
    }),
    viewerId
      ? prisma.follow.findMany({
          where: { followerId: viewerId, following: { ...visibleFanFilter(viewerId), personFollows: { some: { personId: person.id } } } },
          take: 2,
          select: { following: { select: { name: true } } }
        })
      : Promise.resolve([] as { following: { name: string } }[]),
    viewerId ? prisma.follow.count({ where: { followerId: viewerId, following: { ...visibleFanFilter(viewerId), personFollows: { some: { personId: person.id } } } } }) : Promise.resolve(0)
  ]);
  const fans = fanRows.map((f) => ({ id: f.user.id, name: f.user.name, avatar: sharp(f.user.avatar, 60) }));
  const mutual = mutualCount ? { names: mutualRows.map((m) => m.following.name), total: mutualCount } : null;

  const roleLabel = person.role === 'ACTOR' ? t('osoba.herec', 'Herec') : t('osoba.tvurce', 'Tvůrce');
  const facts: { label: string; value: string }[] = [];
  if (person.birthDate) facts.push({ label: t('osoba.narozeni', 'Narození'), value: new Date(person.birthDate).toLocaleDateString('cs-CZ') });
  if (person.birthPlace) facts.push({ label: t('osoba.misto_narozeni', 'Místo narození'), value: person.birthPlace });
  if (age !== null) facts.push({ label: isDead ? t('osoba.dozil_se', 'Dožil(a) se') : t('osoba.vek', 'Věk'), value: `${age} ${t('person.rokov', 'let')}` });
  if (isDead) facts.push({ label: t('osoba.umrti', 'Úmrtí'), value: new Date(person.deathDate!).toLocaleDateString('cs-CZ') });
  if (isDead && person.deathPlace) facts.push({ label: t('osoba.misto_umrti', 'Místo úmrtí'), value: person.deathPlace });
  if (person.subRole) facts.push({ label: t('osoba.profese', 'Profese'), value: person.subRole });
  if (careerSpan) facts.push({ label: t('osoba.aktivni', 'Aktivní'), value: careerSpan });

  const nf = (n: number) => n.toLocaleString('cs-CZ');
  const backdrop = sharp(top?.poster || null, 300) || sharp(person.photo, 300);

  const timeline =
    careerMilestones.length > 0 ? (
      isMember ? (
        <CareerTimelineModal
          personName={person.name}
          milestones={careerMilestones}
          buttonClassName="ap-chip ap-glass text-white !px-4 !py-2.5 !text-[14px] hover:bg-white/20"
          buttonLabel={t('osoba.casova_osa', 'Časová osa kariéry')}
        />
      ) : (
        <Link href="/nastavenia/clenstvo" className="ap-chip ap-glass text-white !px-4 !py-2.5 !text-[14px] hover:bg-white/20" title={t('osoba.jen_pro_cleny', 'Jen pro členy Golden Ticket')}>
          <img src="/golden-ticket-badge.svg" alt="" width={16} height={16} />
          {t('osoba.casova_osa', 'Časová osa kariéry')}
        </Link>
      )
    ) : null;

  return (
    <div className="pt-4 sm:pt-6 pb-10">
      {person.approved && (
        <script
          nonce={(await headers()).get('x-nonce') ?? undefined}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: personJsonLd({ name: person.name, slug: person.slug, bio: person.bio, photo: person.photo, role: person.role })
          }}
        />
      )}
      {!person.approved && (
        <div className="mb-5 bg-amber-50 border border-amber-300 text-amber-800 text-sm font-semibold rounded-xl px-4 py-3">
          {t('person.caka_na_schvalenie')}
        </div>
      )}

      <PersonHero
        slug={person.slug}
        personId={person.id}
        name={person.name}
        photo={sharp(person.photo, 200)}
        roleLabel={roleLabel}
        activeLabel={careerSpan ? `${t('osoba.aktivni', 'Aktivní')} ${careerSpan}` : null}
        popularity={popularity}
        bornLine={
          person.birthDate
            ? `${fmtDate(person.birthDate)}${age !== null && !isDead ? ` · ${age} ${t('person.rokov', 'let')}` : ''}`
            : null
        }
        diedLine={
          isDead
            ? `${t('osoba.zemrel', 'Zemřel(a)')} ${fmtDate(person.deathDate!)}${person.deathPlace ? `, ${person.deathPlace}` : ''}${age !== null ? ` · ${t('osoba.ve_veku', 've věku')} ${age} ${t('person.rokov', 'let')}` : ''}`
            : null
        }
        place={person.birthPlace}
        flag={countryFlag}
        bio={person.bio}
        backdrop={backdrop}
        knownFor={ourMovies.slice(0, 3).map((m) => ({ slug: m.slug, title: m.title, poster: sharp(m.poster, 140), percent: m.percent }))}
        stats={[
          { value: nf(movies.length), label: t('osoba.u_nas', 'filmů a seriálů u nás') },
          { value: allTitles.length ? nf(allTitles.length) : '—', label: t('osoba.ve_filmografii', 'v celé filmografii') },
          { value: nf(person._count.followers), label: t('osoba.fanousku', 'fanoušků') },
          { value: avgPercent !== null ? `${avgPercent}%` : '—', label: t('osoba.prumer', 'průměr jeho filmů') }
        ]}
        topTitle={top && top.percent !== null ? { slug: top.slug, title: top.title, poster: sharp(top.poster, 40), percent: top.percent } : null}
        canFollow={!!viewerId}
        isFollowing={isFollowing}
        timeline={timeline}
        socials={externalLinks ? { instagramUrl: externalLinks.instagramUrl, twitterUrl: externalLinks.twitterUrl, facebookUrl: externalLinks.facebookUrl } : null}
        labels={{
          popularita: t('osoba.popularita', 'Popularita'),
          popularita_info: t('person.popularita_vysvetlenie', ''),
          znamy_z: t('osoba.znamy_z', 'Známý z'),
          nejuspesnejsi: t('osoba.nejuspesnejsi', 'Nejúspěšnější titul'),
          prihlas_se: t('osoba.prihlas_se', 'Přihlas se a přidej do oblíbených')
        }}
      />

      <div className="mt-6">
        <PersonTabs
          movies={ourMovies.map(({ genres: _g, ratings: _r, ...m }) => m)}
          career={career}
          photos={photos}
          news={relatedNews.map((n) => ({ title: n.title, slug: n.slug, coverImage: sharp(n.coverImage, 400), movieTitle: n.movie?.title || '' }))}
          bio={person.bio}
          categories={filmographyCategories}
          filmographyCount={allTitles.length}
          sidebar={
            <PersonSidebar
              facts={facts}
              collaborators={frequentCollaborators.map((c) => ({ ...c, photo: sharp(c.photo, 50) }))}
              genres={genres}
              fans={fans}
              fanCount={person._count.followers}
              mutual={mutual}
              L={{
                o_osobnosti: t('osoba.o_osobnosti', 'O osobnosti'),
                casto_spolupracuje: t('osoba.casto_spolupracuje', 'Často spolupracuje s'),
                spolu: t('osoba.spolu', 'spolu'),
                film_1: t('osoba.film_1', 'film'),
                film_2_4: t('osoba.film_2_4', 'filmy'),
                film_5: t('osoba.film_5', 'filmů'),
                na_zaklade: t('osoba.na_zaklade', 'Podle filmů v naší databázi.'),
                zanry: t('osoba.zanry', 'Žánry jeho filmů'),
                fanousci: t('osoba.fanousci', 'Fanoušci'),
                zadni_fanousci: t('osoba.zadni_fanousci', 'Zatím ho nikdo nemá v oblíbených.'),
                ma_ho_i: t('osoba.ma_ho_i', 'V oblíbených ho má i'),
                a_dalsi: t('osoba.a_dalsi', 'a další')
              }}
            />
          }
        />
      </div>
    </div>
  );
}
