import { prisma } from '@/lib/prisma';
import { publishedNewsFilter } from '@/lib/publishedFilter';
import { personJsonLd } from '@/lib/jsonLd';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PersonFollowButton from '@/components/PersonFollowButton';
import PersonProfileMain from '@/components/PersonProfileMain';
import { calculateAge } from '@/lib/personUtils';
import { computePercent } from '@/lib/rating';
import { prepareFilmographyCategories } from '@/lib/personFilmography';
import { tmdbGetPersonImages, tmdbGetPersonPopularity } from '@/lib/tmdb';

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
  const [relatedNews, filmographyCategories, photos, popularity] = await Promise.all([
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
    person.tmdbId ? tmdbGetPersonPopularity(person.tmdbId) : Promise.resolve(null)
  ]);

  const isDead = !!person.deathDate;
  const age = person.birthDate ? calculateAge(new Date(person.birthDate), person.deathDate ? new Date(person.deathDate) : null) : null;

  // Štatistiky kariéry — počítané výhradne z filmov, čo máme reálne u nás v databáze.
  const yearsWithData = movies.map((m) => parseInt(m.year || '', 10)).filter((y) => !isNaN(y));
  const careerSpan = yearsWithData.length > 0 ? `${Math.min(...yearsWithData)}–${Math.max(...yearsWithData)}` : null;
  const topRated = [...movies]
    .map((m) => ({ title: m.title, percent: computePercent(m.ratings) }))
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
          <div className="relative flex-none">
            <div
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-surface bg-cover bg-center shadow-sm ring-4 ring-surface"
              style={person.photo ? { backgroundImage: `url('${person.photo}')` } : undefined}
            />
            {popularity !== null && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-accent px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm">
                {popularity.toFixed(0)} pop.
              </span>
            )}
          </div>
          <div className="flex-1 min-w-[240px]">
            <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{person.name}</h1>
            <span className="inline-block text-xs font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full mb-4">
              {person.role === 'ACTOR' ? 'Herec / herečka' : 'Tvorca'}
            </span>

            <div className="text-sm text-muted space-y-0.5 mb-4">
              {person.birthDate && (
                <div>
                  Narodený/-á {new Date(person.birthDate).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {person.birthPlace && ` · ${person.birthPlace}`}
                  {age !== null && !isDead && ` · ${age} rokov`}
                </div>
              )}
              {isDead && (
                <div>
                  Zomrel/-a {new Date(person.deathDate!).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {person.deathPlace && ` · ${person.deathPlace}`}
                  {age !== null && ` · dožil/-a sa ${age} rokov`}
                </div>
              )}
            </div>

            {viewerId ? (
              <PersonFollowButton personId={person.id} initialFollowing={isFollowing} />
            ) : (
              <p className="text-xs text-muted">
                <Link href="/login" className="text-accent font-semibold hover:underline">Prihlás sa</Link> a sleduj túto osobu.
              </p>
            )}
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
        <div className="p-4 text-center min-w-0">
          <div className="font-display font-bold text-xl text-ink truncate">{topRated ? `${topRated.percent}%` : '—'}</div>
          <div className="text-[11px] text-muted mt-0.5 truncate">{topRated ? topRated.title : 'najlepšie hodnotený titul'}</div>
        </div>
      </div>

      <PersonProfileMain
        bio={person.bio}
        movies={movies}
        news={relatedNews.map((n) => ({ title: n.title, slug: n.slug, coverImage: n.coverImage, movieTitle: n.movie?.title || '' }))}
        filmographyCategories={filmographyCategories}
        photos={photos}
      />
    </div>
  );
}
