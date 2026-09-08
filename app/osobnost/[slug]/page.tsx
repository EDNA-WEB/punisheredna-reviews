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

      {/* Hlavička — na celú šírku, nad dvojstĺpcovým rozložením */}
      <div className="border border-line rounded-xl bg-card p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-6 flex-wrap">
          <div
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-surface bg-cover bg-center flex-none shadow-sm ring-4 ring-surface"
            style={person.photo ? { backgroundImage: `url('${person.photo}')` } : undefined}
          />
          <div className="flex-1 min-w-[240px]">
            <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{person.name}</h1>
            <span className="inline-block text-xs font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full mb-4">
              {person.role === 'ACTOR' ? 'Herec / herečka' : 'Tvorca'}
            </span>

            <div className="flex flex-wrap gap-x-8 gap-y-3 mb-4">
              {age !== null && (
                <div>
                  <div className="font-display font-bold text-2xl text-ink leading-none">{age}</div>
                  <div className="text-[11px] text-muted mt-1">{isDead ? 'rokov (dožil/-a sa)' : 'rokov'}</div>
                </div>
              )}
              <div>
                <div className="font-display font-bold text-2xl text-ink leading-none">{person.followers.length}</div>
                <div className="text-[11px] text-muted mt-1">sledovateľov</div>
              </div>
              <div>
                <div className="font-display font-bold text-2xl text-ink leading-none">{movies.length}</div>
                <div className="text-[11px] text-muted mt-1">filmov u nás</div>
              </div>
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

      {/* Dvojstĺpcové rozloženie — hlavný obsah vľavo, osobné údaje vpravo */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="min-w-0">
          {person.tmdbId && <PersonPhotoGallery tmdbId={person.tmdbId} />}
          {person.tmdbId && <PersonTmdbFilmography tmdbId={person.tmdbId} role={person.role} />}

          <PersonProfileTabs
            bio={person.bio}
            movies={movies}
            news={relatedNews.map((n) => ({ title: n.title, slug: n.slug, coverImage: n.coverImage, movieTitle: n.movie?.title || '' }))}
          />
        </div>

        <div className="border border-line rounded-xl bg-card p-5 lg:sticky lg:top-20">
          <h3 className="font-display font-bold text-sm text-ink mb-4">Osobné údaje</h3>
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">Rola</div>
              <div className="text-ink">{person.role === 'ACTOR' ? 'Herec / herečka' : 'Tvorca'}</div>
            </div>
            {person.birthDate && (
              <div>
                <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">Narodený/-á</div>
                <div className="text-ink">{new Date(person.birthDate).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            )}
            {person.birthPlace && (
              <div>
                <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">Miesto narodenia</div>
                <div className="text-ink">{person.birthPlace}</div>
              </div>
            )}
            {isDead && (
              <div>
                <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">Zomrel/-a</div>
                <div className="text-ink">
                  {new Date(person.deathDate!).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {person.deathPlace && ` · ${person.deathPlace}`}
                </div>
              </div>
            )}
            <div>
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">Sledovatelia</div>
              <div className="text-ink">{person.followers.length}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1">Filmov a seriálov u nás</div>
              <div className="text-ink">{movies.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
