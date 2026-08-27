'use client';

import { useGoToMovieTab } from './MovieTabsSection';
import { useT } from './TranslationProvider';

export default function MovieGoToTabButton({ tabKey, label }: { tabKey: string; label?: string }) {
  const goToTab = useGoToMovieTab();
  const t = useT();
  return (
    <button onClick={() => goToTab(tabKey)} className="text-[11px] font-bold text-white bg-accent px-3 py-1 rounded-full hover:bg-accent-dark">
      {label || t('movie.viac_button')}
    </button>
  );
}
