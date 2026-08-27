import Link from 'next/link';
import StarRating from './StarRating';
import { displayUserName } from '@/lib/deletedUser';

type Rater = { id: string; name: string; value: number };
type WantsToWatch = { id: string; name: string };

export default function MovieRatersLists({
  raters,
  wantToWatch,
  t = (k: string) => k
}: {
  raters: Rater[];
  wantToWatch: WantsToWatch[];
  t?: (key: string) => string;
}) {
  if (raters.length === 0 && wantToWatch.length === 0) return null;

  return (
    <div className="space-y-5 mt-4 text-xs">
      {raters.length > 0 && (
        <div>
          <div className="font-semibold text-ink mb-2">{t('movie.hodnotenia')}</div>
          <div className="space-y-1.5">
            {raters.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 flex-wrap">
                <Link href={`/profile/${r.id}`} className="text-accent hover:underline break-words">{displayUserName(r.name, t)}</Link>
                <StarRating rating={r.value} size="w-2.5 h-2.5" />
              </div>
            ))}
          </div>
        </div>
      )}
      {wantToWatch.length > 0 && (
        <div>
          <div className="font-semibold text-ink mb-2">{t('movie.chcu_vidiet')}</div>
          <div className="space-y-1.5">
            {wantToWatch.map((u) => (
              <Link key={u.id} href={`/profile/${u.id}`} className="block text-accent hover:underline break-words">
                {displayUserName(u.name, t)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
