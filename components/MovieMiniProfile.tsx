import Link from 'next/link';
import StarRating from './StarRating';
import { computeBlendedPercent } from '@/lib/rating';

type MovieMiniProfileData = {
  title: string;
  slug: string;
  poster: string | null;
  year: string | null;
  genres: string | null;
  countries: string | null;
  contentType: string;
  tmdbVoteAverage: number | null;
  tmdbVoteCount: number | null;
  ratings: { value: number }[];
  seasons: { id: string }[];
  streamingServices: { streamingService: { name: string; icon: string | null } }[];
};

export default function MovieMiniProfile({ movie }: { movie: MovieMiniProfileData }) {
  const percent = computeBlendedPercent(movie.ratings, movie.tmdbVoteAverage, movie.tmdbVoteCount);
  const genreList = (movie.genres || '').split(',').map((g) => g.trim()).filter(Boolean).slice(0, 3);
  const countryList = (movie.countries || '').split(',').map((c) => c.trim()).filter(Boolean);
  const isSeries = movie.contentType === 'Seriál';

  return (
    <div className="border border-line rounded-xl overflow-hidden mb-8">
      <Link href={`/movie/${movie.slug}`} className="flex gap-3.5 p-4 hover:bg-surface transition-colors">
        <div className="relative w-20 h-28 rounded-lg overflow-hidden bg-surface flex-none">
          {movie.poster && (
            <img src={movie.poster} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-accent uppercase tracking-wider mb-1">
            {isSeries ? 'Seriál' : 'Film'}
          </div>
          <div className="font-display font-bold text-[15px] text-ink leading-snug mb-1.5">{movie.title}</div>
          {percent !== null && (
            <div className="flex items-center gap-1.5 mb-1">
              <StarRating rating={percent / 20} size="w-3.5 h-3.5" />
              <span className="text-xs text-muted">{percent}%</span>
            </div>
          )}
          <div className="text-xs text-muted">
            {[movie.year, countryList[0]].filter(Boolean).join(' · ')}
            {isSeries && movie.seasons.length > 0 && ` · ${movie.seasons.length} ${movie.seasons.length === 1 ? 'séria' : movie.seasons.length < 5 ? 'série' : 'sérií'}`}
          </div>
        </div>
      </Link>

      {genreList.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {genreList.map((g) => (
            <span key={g} className="text-[11px] font-semibold text-muted bg-surface border border-line rounded-full px-2 py-0.5">
              {g}
            </span>
          ))}
        </div>
      )}

      {movie.streamingServices.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Kde sledovať</div>
          <div className="flex flex-wrap gap-2">
            {movie.streamingServices.slice(0, 5).map((s, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-surface border border-line rounded-full px-2.5 py-1">
                {s.streamingService.icon && <img src={s.streamingService.icon} alt="" className="w-3.5 h-3.5" />}
                {s.streamingService.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
