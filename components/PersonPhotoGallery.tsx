import { tmdbGetPersonImages } from '@/lib/tmdb';

export default async function PersonPhotoGallery({ tmdbId }: { tmdbId: number }) {
  const photos = await tmdbGetPersonImages(tmdbId);
  if (photos.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="font-display font-bold text-lg text-ink mb-3">Fotogaléria</h3>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1">
        {photos.map((url, i) => (
          <div
            key={i}
            className="flex-none snap-start w-32 h-44 rounded-lg bg-surface bg-cover bg-center"
            style={{ backgroundImage: `url('${url}')` }}
          />
        ))}
      </div>
    </div>
  );
}
