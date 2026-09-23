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
  streamingServices: { url: string; streamingService: { name: string; icon: string | null } }[];
};

export default function MovieMiniProfile({ movie }: { movie: MovieMiniProfileData }) {
  const percent = computeBlendedPercent(movie.ratings, movie.tmdbVoteAverage, movie.tmdbVoteCount);
  const genreList = (movie.genres || '').split(',').map((g) => g.trim()).filter(Boolean).slice(0, 3);
  const countryList = (movie.countries || '').split(',').map((c) => c.trim()).filter(Boolean);
  const isSeries = movie.contentType === 'Seriál';

  return (
    <div className="relative rounded-2xl overflow-hidden mb-8 shadow-lg">
      {/* Poster ako pozadie celého boxíku — s tmavým prechodom zdola, nech je
          text nad ním vždy čitateľný bez ohľadu na to, aký svetlý plagát je. */}
      <div className="relative min-h-[320px]">
        {movie.poster ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${movie.poster}')` }} />
        ) : (
          <div className="absolute inset-0 bg-night" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/10" />

        <Link href={`/movie/${movie.slug}`} className="relative flex flex-col justify-end min-h-[320px] p-5">
          <span className="inline-block w-fit text-[10px] font-bold uppercase tracking-wider text-white bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 mb-2.5">
            {isSeries ? 'Seriál' : 'Film'}
          </span>
          <h3 className="font-display font-extrabold text-xl text-white leading-tight mb-2 drop-shadow-lg hover:underline">
            {movie.title}
          </h3>
          {percent !== null && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <StarRating rating={percent / 20} size="w-4 h-4" />
              <span className="text-sm font-semibold text-white/90">{percent}%</span>
            </div>
          )}
          <div className="text-sm text-white/80">
            {[movie.year, countryList[0]].filter(Boolean).join(' · ')}
            {isSeries && movie.seasons.length > 0 &&
              ` · ${movie.seasons.length} ${movie.seasons.length === 1 ? 'séria' : movie.seasons.length < 5 ? 'série' : 'sérií'}`}
          </div>
        </Link>
      </div>

      <div className="bg-card border border-t-0 border-line rounded-b-2xl">
        {genreList.length > 0 && (
          <div className="px-5 py-3.5 flex flex-wrap gap-1.5 border-b border-line">
            {genreList.map((g) => (
              <span key={g} className="text-[11px] font-semibold text-muted bg-surface border border-line rounded-full px-2.5 py-1">
                {g}
              </span>
            ))}
          </div>
        )}

        {movie.streamingServices.length > 0 && (
          <div className="px-5 py-3.5">
            <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2.5">Kde sledovať</div>
            <div className="flex flex-wrap gap-2">
              {movie.streamingServices.slice(0, 5).map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-surface border border-line rounded-full px-2.5 py-1.5 hover:border-accent hover:text-accent transition-colors"
                >
                  {s.streamingService.icon && <img src={s.streamingService.icon} alt="" className="w-3.5 h-3.5" />}
                  {s.streamingService.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
