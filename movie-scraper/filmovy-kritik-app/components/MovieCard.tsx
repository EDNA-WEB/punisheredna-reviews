import Link from 'next/link';
import ScoreBadge from './ScoreBadge';
import AudioBadges from './AudioBadges';

export default function MovieCard({
  movie
}: {
  movie: {
    title: string;
    slug: string;
    poster: string | null;
    year: string | null;
    percent: number | null;
    ratingCount: number;
    genre?: string | null;
    hasSubtitles?: boolean;
    hasDubbing?: boolean;
    releaseDate?: Date | string | null;
    isCamVersion?: boolean;
    contentType?: string;
    premiereType?: string | null;
  };
}) {
  const isUpcoming = !!(movie.releaseDate && new Date(movie.releaseDate) > new Date());

  function upcomingLabel(): string {
    if (!movie.releaseDate) return 'Čoskoro';
    const premiereYear = new Date(movie.releaseDate).getFullYear();
    const currentYear = new Date().getFullYear();
    // Ak premiéra nie je v aktuálnom roku (napr. film vyjde až o rok/dva),
    // konkrétny typ (kino/VOD) sa ešte môže zmeniť — radšej jednotné "Čoskoro".
    if (premiereYear !== currentYear) return 'Čoskoro';

    if (movie.contentType === 'Seriál') return 'Čoskoro na VOD';
    return movie.premiereType === 'VOD' ? 'Čoskoro na VOD' : 'Čoskoro v kinách';
  }

  return (
    <Link href={`/movie/${movie.slug}`} className="block group">
      <div className="relative rounded-xl overflow-hidden bg-surface aspect-[2/3] mb-2.5">
        {movie.poster && (
          <div
            className={`absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03] ${isUpcoming ? 'opacity-70' : ''}`}
            style={{ backgroundImage: `url('${movie.poster}')` }}
          />
        )}
        {movie.genre && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-night/70 text-white backdrop-blur-sm">
            {movie.genre}
          </span>
        )}
        {isUpcoming && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/85 text-ink backdrop-blur-sm border border-line">
            {upcomingLabel()}
          </span>
        )}
        {movie.isCamVersion && (
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger text-white shadow-sm">
            CAM
          </span>
        )}
        <div className="absolute bottom-2 left-2">
          <ScoreBadge percent={movie.percent} count={movie.ratingCount} size="sm" />
        </div>
      </div>
      <div className="flex items-start gap-1.5">
        <h4 className="font-display font-bold text-[15px] leading-snug text-ink group-hover:text-accent transition-colors flex-1">
          {movie.title}
        </h4>
        <span className="flex-none pt-0.5">
          <AudioBadges hasSubtitles={!!movie.hasSubtitles} hasDubbing={!!movie.hasDubbing} />
        </span>
      </div>
      {movie.year && <p className="text-xs text-muted mt-0.5">{movie.year}</p>}
    </Link>
  );
}
