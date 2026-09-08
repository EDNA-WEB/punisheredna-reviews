import { prisma } from '@/lib/prisma';
import { publishedNewsFilter } from '@/lib/publishedFilter';
import { personJsonLd } from '@/lib/jsonLd';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PersonFollowButton from '@/components/PersonFollowButton';
import PersonProfileTabs from '@/components/PersonProfileTabs';
import PersonTmdbFilmography from '@/components/PersonTmdbFilmography';
import PersonPhotoGallery from '@/components/PersonPhotoGallery';
import { calculateAge } from '@/lib/personUtils';

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
  const relatedNews = movieIds.length
    ? await prisma.newsPost.findMany({
        where: { movieId: { in: movieIds }, ...publishedNewsFilter() },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { title: true, slug: true, coverImage: true, movie: { select: { title: true } } }
      })
    : [];

  const isDead = !!person.deathDate;
  const age = person.birthDate ? calculateAge(new Date(person.birthDate), person.deathDate ? new Date(person.deathDate) : null) : null;

  return (
    <div className="pt-8 max-w-2xl mx-auto">
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
      <div className="border border-line rounded-xl bg-card p-5 mb-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-surface bg-cover bg-center flex-none shadow-sm ring-4 ring-surface"
            style={person.photo ? { backgroundImage: `url('${person.photo}')` } : undefined}
          />
          <div className="flex-1 min-w-[200px]">
            <h1 className="font-display font-extrabold text-2xl text-ink mb-2">{person.name}</h1>
            <span className="inline-block text-xs font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full mb-3">
              {person.role === 'ACTOR' ? 'Herec / herečka' : 'Tvorca'}
            </span>

            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
              {age !== null && (
                <div>
                  <div className="font-display font-bold text-lg text-ink leading-none">{age}</div>
                  <div className="text-[11px] text-muted mt-0.5">{isDead ? 'rokov (dožil/-a sa)' : 'rokov'}</div>
                </div>
              )}
              <div>
                <div className="font-display font-bold text-lg text-ink leading-none">{person.followers.length}</div>
                <div className="text-[11px] text-muted mt-0.5">sledovateľov</div>
              </div>
              <div>
                <div className="font-display font-bold text-lg text-ink leading-none">{movies.length}</div>
                <div className="text-[11px] text-muted mt-0.5">filmov u nás</div>
              </div>
            </div>

            <div className="text-sm text-muted space-y-0.5 mb-4">
              {person.birthDate && (
                <div>
                  Narodený/-á {new Date(person.birthDate).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {person.birthPlace && ` · ${person.birthPlace}`}
                </div>
              )}
              {isDead && (
                <div>
                  Zomrel/-a {new Date(person.deathDate!).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {person.deathPlace && ` · ${person.deathPlace}`}
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

      {person.tmdbId && <PersonPhotoGallery tmdbId={person.tmdbId} />}
      {person.tmdbId && <PersonTmdbFilmography tmdbId={person.tmdbId} role={person.role} />}

      <PersonProfileTabs
        bio={person.bio}
        movies={movies}
        news={relatedNews.map((n) => ({ title: n.title, slug: n.slug, coverImage: n.coverImage, movieTitle: n.movie?.title || '' }))}
      />
    </div>
  );
}
