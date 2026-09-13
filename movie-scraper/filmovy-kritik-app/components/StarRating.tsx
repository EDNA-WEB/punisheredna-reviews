import { IconStar } from './Icons';
import { starsFromValue } from '@/lib/rating';

export default function StarRating({ rating, size = 'w-4 h-4' }: { rating: number; size?: string }) {
  const { full, half, empty } = starsFromValue(rating);

  return (
    <span className="inline-flex items-center gap-0.5 text-accent">
      {Array.from({ length: full }).map((_, i) => (
        <IconStar key={`f${i}`} className={size} filled />
      ))}
      {half && (
        <span className={`relative ${size}`}>
          <IconStar className={`absolute inset-0 ${size} text-line`} filled={false} />
          <span className="absolute inset-0 w-1/2 overflow-hidden">
            <IconStar className={`${size} text-accent`} filled />
          </span>
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <IconStar key={`e${i}`} className={`${size} text-line`} filled={false} />
      ))}
    </span>
  );
}
