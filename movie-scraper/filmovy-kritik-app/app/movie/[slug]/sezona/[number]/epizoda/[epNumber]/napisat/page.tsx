import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import ReviewForm from '@/components/ReviewForm';

export default async function WriteEpisodeReviewPage({ params }: { params: { slug: string; number: string; epNumber: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
  if (!user || user.banned) redirect(`/movie/${params.slug}`);

  const movie = await prisma.movie.findUnique({ where: { slug: params.slug } });
  if (!movie) return notFound();

  const season = await prisma.season.findUnique({ where: { movieId_number: { movieId: movie.id, number: Number(params.number) } } });
  if (!season) return notFound();
  if (!season.released) redirect(`/movie/${params.slug}/sezona/${season.number}`);

  const episode = await prisma.episode.findUnique({ where: { seasonId_number: { seasonId: season.id, number: Number(params.epNumber) } } });
  if (!episode) return notFound();

  const existing = await prisma.review.findFirst({
    where: { movieId: movie.id, authorId: user.id, seasonId: season.id, episodeId: episode.id }
  });
  if (existing) redirect(`/movie/${params.slug}/upravit/${existing.id}`);

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">Napísať recenziu</h1>
      <p className="text-muted mb-8">{movie.title} — {episode.title || `Epizóda ${episode.number}`}</p>
      <ReviewForm
        initial={{ movieId: movie.id }}
        movieLocked
        apiBase={`/api/episodes/${episode.id}`}
        redirectTo={`/movie/${params.slug}/sezona/${season.number}/epizoda/${episode.number}`}
      />
    </div>
  );
}
