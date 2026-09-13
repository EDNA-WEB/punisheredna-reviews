'use client';

import { useRouter } from 'next/navigation';
import { useT } from './TranslationProvider';

export default function ReviewSortSelect({ movieSlug, sortMode }: { movieSlug: string; sortMode: string }) {
  const router = useRouter();
  const t = useT();
  const options = [
    { key: 'rating', label: t('movie.sort_hodnotenie') },
    { key: 'newest', label: t('movie.sort_najnovsie') },
    { key: 'oldest', label: t('movie.sort_najstarsie') },
    { key: 'karma', label: t('movie.sort_karma') }
  ];
  return (
    <select
      className="field-input-sm w-auto"
      value={sortMode}
      onChange={(e) => router.push(`/movie/${movieSlug}?sort=${e.target.value}#movie-tabs-top`)}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
    </select>
  );
}
