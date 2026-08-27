import Link from 'next/link';
import { IconUser } from './Icons';
import StarRating from './StarRating';
import CriticBadge from './CriticBadge';
import { excerpt } from '@/lib/markdown';

type Props = {
  slug: string;
  body: string;
  author: { id: string; name: string; avatar: string | null; membershipUntil?: string | Date | null };
  rating: number;
  movieTitle: string;
  movieYear: string | null;
  moviePoster: string | null;
  showCriticBadge?: boolean;
};

export default function ReviewPreviewCard({ slug, body, author, rating, movieTitle, movieYear, moviePoster, showCriticBadge }: Props) {
  const isMember = author.membershipUntil && new Date(author.membershipUntil) > new Date();
  return (
    <div className="border border-line rounded-xl p-3.5 bg-card">
      <Link href={`/profile/${author.id}`} className="flex items-center gap-2 mb-3 hover:text-accent">
        {author.avatar ? (
          <img src={author.avatar} alt={author.name} className="w-7 h-7 rounded-full object-cover flex-none" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center flex-none">
            <IconUser className="w-3.5 h-3.5 text-muted" />
          </div>
        )}
        <span className="text-xs font-semibold text-ink leading-tight">{author.name}</span>
        {showCriticBadge && <CriticBadge size="w-3.5 h-3.5" label={false} />}
      </Link>

      <div className="flex gap-3">
        <div
          className="w-14 h-20 rounded-lg bg-surface bg-cover bg-center flex-none"
          style={moviePoster ? { backgroundImage: `url('${moviePoster}')` } : undefined}
        />
        <div className="min-w-0 flex-1">
          <StarRating rating={rating} size="w-3.5 h-3.5" />
          <Link href={`/movie/${slug}`} className="block mt-1">
            <h4 className="font-display font-bold text-sm text-ink leading-snug hover:text-accent transition-colors">
              {movieTitle} {movieYear && <span className="text-muted font-normal">· {movieYear}</span>}
            </h4>
          </Link>
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed mt-2.5">
        {excerpt(body, 110)}{' '}
        <Link href={`/movie/${slug}`} className="text-accent font-semibold hover:underline">viac</Link>
      </p>
    </div>
  );
}
