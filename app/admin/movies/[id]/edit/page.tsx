import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import MovieForm from '@/components/MovieForm';
import MovieGalleryManager from '@/components/MovieGalleryManager';
import MovieTriviaManager from '@/components/MovieTriviaManager';
import MovieVideoManager from '@/components/MovieVideoManager';
import SeasonManager from '@/components/SeasonManager';

export default async function EditMoviePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const movie = await prisma.movie.findUnique({ where: { id: params.id } });
  if (!movie) return notFound();

  const [photos, trivia, videos, seasons] = await Promise.all([
    prisma.moviePhoto.findMany({
      where: { movieId: params.id, episodeId: null },
      orderBy: { order: 'asc' },
      select: { id: true, thumbnail: true }
    }),
    prisma.movieTrivia.findMany({
      where: { movieId: params.id },
      orderBy: { order: 'asc' },
      select: { id: true, text: true }
    }),
    prisma.movieVideo.findMany({
      where: { movieId: params.id, episodeId: null, seasonId: null },
      orderBy: { order: 'asc' },
      select: { id: true, url: true, category: true, title: true }
    }),
    prisma.season.findMany({
      where: { movieId: params.id },
      orderBy: { number: 'asc' },
      select: {
        id: true,
        number: true,
        year: true,
        episodeCount: true,
        released: true,
        releaseDate: true,
        videos: { where: { episodeId: null }, select: { id: true, url: true, title: true } },
        episodes: {
          orderBy: { number: 'asc' },
          select: {
            id: true,
            number: true,
            title: true,
            synopsis: true,
            onlineImage: true,
            photos: { select: { id: true, thumbnail: true } },
            videos: { select: { id: true, url: true, title: true } }
          }
        }
      }
    })
  ]);

  return (
    <div className="pt-8">
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">
        {movie.contentType === 'Seriál' ? 'Upraviť seriál' : movie.contentType === 'TV film' ? 'Upraviť TV film' : 'Upraviť film'}
      </h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <MovieForm initial={movie} />

        <div className="space-y-4">
          <MovieGalleryManager movieId={movie.id} initialPhotos={photos} />
          <MovieTriviaManager movieId={movie.id} initialTrivia={trivia} />
          <MovieVideoManager movieId={movie.id} initialVideos={videos} />
          {movie.contentType === 'Seriál' && (
            <SeasonManager
              movieId={movie.id}
              initialSeasons={seasons.map((s) => ({ ...s, releaseDate: s.releaseDate ? s.releaseDate.toISOString() : null }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
