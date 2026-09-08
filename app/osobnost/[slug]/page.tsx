import { prisma } from '@/lib/prisma';
import { publishedNewsFilter } from '@/lib/publishedFilter';
import { personJsonLd } from '@/lib/jsonLd';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PersonFollowButton from '@/components/PersonFollowButton';
import PopularityBadge from '@/components/PopularityBadge';
import PersonProfileMain from '@/components/PersonProfileMain';
import { calculateAge } from '@/lib/personUtils';
import { computePercent } from '@/lib/rating';
import { prepareFilmographyCategories } from '@/lib/personFilmography';
import { tmdbGetPersonImages, tmdbGetPersonPopularity, tmdbGetPersonExternalIds } from '@/lib/tmdb';
import { IconImdb, IconInstagram, IconTwitterX, IconFacebook } from '@/components/Icons';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { findFrequentCollaborators } from '@/lib/collaborators';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const person = await prisma.person.findUnique({ where: { slug: params.slug }, select: { name: true, bio: true, photo: true, role: true } });
  if (!person) return {};
  const description = person.bio
    ? person.bio.slice(0, 160)
    : `Filmografia, fotky a informácie o osobe ${person.name} na PunisherEDNA reviews.`;
  return {
    title: person.name,
    description,
    openGraph: { title: person.name, description, images: person.photo ? [{ url: person.photo }] : undefined, type: 'profile' }
  };
}

export default async function PersonPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as any)?.id;

  const person = await prisma.person.findUnique({
    where: { slug: params.slug },
    include: { followers: true }
  });
  if (!person) return notFound();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  if (!person.approved && person.submittedById !== viewerId && !isAdmin) return notFound();

  const isFollowing = viewerId ? person.followers.some((f) => f.userId === viewerId) : false;

  const movies =
    person.role === 'ACTOR'
      ? await prisma.movie.findMany({
          where: { cast: { contains: person.name, mode: 'insensitive' } },
          orderBy: { year: 'desc' },
          select: { id: true, title: true, slug: true, year: true, poster: true, ratings: { select: { value: true } } }
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
          select: { id: true, title: true, slug: true, year: true, poster: true, ratings: { select: { value: true } } }
        });

  const movieIds = movies.map((m) => m.id);
  const [relatedNews, filmographyCategories, photos, popularity, externalLinks, frequentCollaborators] = await Promise.all([
    movieIds.length
      ? prisma.newsPost.findMany({
          where: { movieId: { in: movieIds }, ...publishedNewsFilter() },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { title: true, slug: true, coverImage: true, movie: { select: { title: true } } }
        })
      : Promise.resolve([]),
    person.tmdbId ? prepareFilmographyCategories(person.tmdbId, person.role) : Promise.resolve(null),
    person.tmdbId ? tmdbGetPersonImages(person.tmdbId) : Promise.resolve([]),
    person.tmdbId ? tmdbGetPersonPopularity(person.tmdbId) : Promise.resolve(null),
    person.tmdbId ? tmdbGetPersonExternalIds(person.tmdbId) : Promise.resolve(null),
    findFrequentCollaborators(person.name, movieIds, person.id)
  ]);

  const isDead = !!person.deathDate;
  const countryFlag = getCountryFlagUrl(person.birthPlace);
  const age = person.birthDate ? calculateAge(new Date(person.birthDate), person.deathDate ? new Date(person.deathDate) : null) : null;

  // Aktívne obdobie — počítané z CELEJ TMDb filmografie (nie len z tých pár
  // filmov, čo máme aktuálne recenzované u nás), inak by pri hercovi s dlhou
  // karierou, ale len jedným filmom u nás, vyšlo úplne nezmyselné obdobie.
  const allFilmographyYears = (filmographyCategories || [])
    .flatMap((c) => c.items)
    .map((item) => parseInt(item.year || '', 10))
    .filter((y) => !isNaN(y) && y > 1888); // 1888 = najstarší zachovaný film na svete, poistka proti chybným dátam
  const careerSpan = allFilmographyYears.length > 0 ? `${Math.min(...allFilmographyYears)}–${isDead ? new Date(person.deathDate!).getFullYear() : 'súčasnosť'}` : null;

  const topRated = [...movies]
    .map((m) => ({ title: m.title, slug: m.slug, poster: m.poster, percent: computePercent(m.ratings) }))
    .filter((m) => m.percent !== null)
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))[0] || null;

  return (
    <div className="pt-8">
      {person.approved && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: personJsonLd({ name: person.name, slug: person.slug, bio: person.bio, photo: person.photo, role: person.role })
          }}
        />
      )}
      {!person.approved && (
        <div className="mb-5 bg-amber-50 border border-amber-300 text-amber-800 text-sm font-semibold rounded-xl px-4 py-3">
          Tento profil ešte čaká na schválenie administrátorom. Vidíš ho len ty (a admin).
        </div>
      )}

      {/* Hlavička — na celú šírku */}
      <div className="border border-line rounded-xl bg-card p-5 sm:p-6 mb-4">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="w-32 h-44 sm:w-40 sm:h-56 rounded-xl bg-surface bg-cover bg-center shadow-md flex-none" style={person.photo ? { backgroundImage: `url('${person.photo}')` } : undefined} />
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <h1 className="font-display font-extrabold text-3xl text-ink">{person.name}</h1>
              {popularity !== null && <PopularityBadge value={popularity} />}
            </div>
            <span className="inline-block text-xs font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full mb-4">
              {person.role === 'ACTOR' ? 'Herec / herečka' : 'Tvorca'}
            </span>

            <div className="text-sm text-ink space-y-1.5 mb-4">
              {person.birthDate && (
                <div>
                  <span className="text-muted">Narodený/-á:</span> {new Date(person.birthDate).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
              {person.birthPlace && (
                <div className="flex items-center gap-2">
                  <span className="text-muted">Miesto narodenia:</span> {person.birthPlace}
                  {countryFlag && <img src={countryFlag.url} alt={countryFlag.countryName} className="h-3.5 w-auto rounded-sm shadow-sm" />}
                </div>
              )}
              {age !== null && !isDead && (
                <div>
                  <span className="text-muted">Vek:</span> {age} rokov
                </div>
              )}
              {isDead && (
                <>
                  <div>
                    <span className="text-muted">Zomrel/-a:</span> {new Date(person.deathDate!).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  {person.deathPlace && (
                    <div>
                      <span className="text-muted">Miesto úmrtia:</span> {person.deathPlace}
                    </div>
                  )}
                  {age !== null && (
                    <div>
                      <span className="text-muted">Dožil/-a sa:</span> {age} rokov
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {viewerId ? (
                <PersonFollowButton personId={person.id} initialFollowing={isFollowing} />
              ) : (
                <p className="text-xs text-muted">
                  <Link href="/login" className="text-accent font-semibold hover:underline">Prihlás sa</Link> a sleduj túto osobu.
                </p>
              )}
              {externalLinks && (externalLinks.imdbUrl || externalLinks.instagramUrl || externalLinks.twitterUrl || externalLinks.facebookUrl) && (
                <div className="flex items-center gap-1.5">
                  {externalLinks.imdbUrl && (
                    <a href={externalLinks.imdbUrl} target="_blank" rel="noopener noreferrer" title="IMDb" className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors">
                      <IconImdb className="w-4 h-4" />
                    </a>
                  )}
                  {externalLinks.instagramUrl && (
                    <a href={externalLinks.instagramUrl} target="_blank" rel="noopener noreferrer" title="Instagram" className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors">
                      <IconInstagram className="w-4 h-4" />
                    </a>
                  )}
                  {externalLinks.twitterUrl && (
                    <a href={externalLinks.twitterUrl} target="_blank" rel="noopener noreferrer" title="X (Twitter)" className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors">
                      <IconTwitterX className="w-4 h-4" />
                    </a>
                  )}
                  {externalLinks.facebookUrl && (
                    <a href={externalLinks.facebookUrl} target="_blank" rel="noopener noreferrer" title="Facebook" className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors">
                      <IconFacebook className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pruh štatistík kariéry */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-line rounded-xl bg-card divide-x divide-line mb-6 overflow-hidden">
        <div className="p-4 text-center">
          <div className="font-display font-bold text-xl text-ink">{movies.length}</div>
          <div className="text-[11px] text-muted mt-0.5">filmov a seriálov u nás</div>
        </div>
        <div className="p-4 text-center">
          <div className="font-display font-bold text-xl text-ink">{person.followers.length}</div>
          <div className="text-[11px] text-muted mt-0.5">sledovateľov</div>
        </div>
        <div className="p-4 text-center">
          <div className="font-display font-bold text-xl text-ink">{careerSpan || '—'}</div>
          <div className="text-[11px] text-muted mt-0.5">aktívne obdobie</div>
        </div>
        <div className="p-3 min-w-0">
          <div className="text-[11px] text-muted mb-1.5 text-center">Najúspešnejší titul</div>
          {topRated ? (
            <Link href={`/movie/${topRated.slug}`} className="flex items-center gap-2.5 group">
              <div className="relative w-10 h-14 rounded-md overflow-hidden bg-surface flex-none">
                {topRated.poster && <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${topRated.poster}')` }} />}
                <span className="absolute bottom-0.5 left-0.5 text-[9px] font-extrabold text-white bg-accent rounded px-1 leading-tight">
                  {topRated.percent}%
                </span>
              </div>
              <div className="text-sm font-semibold text-ink group-hover:text-accent transition-colors leading-snug line-clamp-2">{topRated.title}</div>
            </Link>
          ) : (
            <div className="text-center text-sm text-muted">—</div>
          )}
        </div>
      </div>

      <PersonProfileMain
        bio={person.bio}
        movies={movies}
        news={relatedNews.map((n) => ({ title: n.title, slug: n.slug, coverImage: n.coverImage, movieTitle: n.movie?.title || '' }))}
        filmographyCategories={filmographyCategories}
        photos={photos}
        collaborators={frequentCollaborators}
      />
    </div>
  );
}
