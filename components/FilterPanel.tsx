'use client';

import { useRouter } from 'next/navigation';
import { IconFilter } from './Icons';
import { useT } from './TranslationProvider';

export default function FilterPanel() {
  const router = useRouter();
  const t = useT();

  return (
    <button
      type="button"
      onClick={() => router.push('/recenzie/filter')}
      aria-label={t('filter.pokrocile_vyhladavanie')}
      title={t('filter.pokrocile_vyhladavanie')}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-none text-muted hover:text-ink hover:bg-card"
    >
      <IconFilter className="w-4 h-4" />
    </button>
  );
}
