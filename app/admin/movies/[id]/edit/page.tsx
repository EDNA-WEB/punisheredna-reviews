import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import MovieForm from '@/components/MovieForm';
import MovieGalleryManager from '@/components/MovieGalleryManager';
import MovieTriviaManager from '@/components/MovieTriviaManager';
import MovieVideoManager from '@/components/MovieVideoManager';
import SeasonManager from '@/components/SeasonManager';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default async function EditMoviePage(props: { params: Promise<{ id: string }> }) {
  const { params } = { ...props, params: await props.params };
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
        synopsis: true,
        episodeCount: true,
        released: true,
        releaseDate: true,
        videos: { where: { episodeId: null }, select: { id: true, url: true, title: true } },
        photos: { where: { episodeId: null }, select: { id: true, thumbnail: true } },
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
    <div className="admin-page">
      <AdminPageHeader title={movie.contentType === 'Seriál' ? 'Upravit seriál' : movie.contentType === 'TV film' ? 'Upravit TV film' : 'Upravit film'} />
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <MovieForm initial={movie} />

        <div className="space-y-4">
          <MovieGalleryManager movieId={movie.id} initialPhotos={photos} />
          <MovieTriviaManager movieId={movie.id} initialTrivia={trivia} />
          <MovieVideoManager movieId={movie.id} initialVideos={videos} />
          {movie.contentType === 'Seriál' && (
            <SeasonManager
              movieId={movie.id}
              tmdbId={movie.tmdbId}
              initialSeasons={seasons.map((s) => ({ ...s, releaseDate: s.releaseDate ? s.releaseDate.toISOString() : null }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
