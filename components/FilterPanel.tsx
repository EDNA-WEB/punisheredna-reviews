'use client';

import { useRouter, usePathname } from 'next/navigation';
import { IconFilter } from './Icons';
import { useT } from './TranslationProvider';
import { useFilterFormState } from './FilterFormState';

export default function FilterPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const { hasInput } = useFilterFormState();

  function handleClick() {
    // Ak už sme na stránke s filtrom a formulár je prázdny, druhé kliknutie
    // na tú istú ikonku ho zavrie (vráti späť). Ak je formulár vyplnený,
    // radšej nič nerobíme, nech používateľ neprídeš o rozpísané hodnoty.
    if (pathname === '/recenzie/filter') {
      if (!hasInput) router.push('/recenzie');
      return;
    }
    router.push('/recenzie/filter');
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t('filter.pokrocile_vyhladavanie')}
      title={t('filter.pokrocile_vyhladavanie')}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-none text-muted hover:text-ink hover:bg-card"
    >
      <IconFilter className="w-4 h-4" />
    </button>
  );
}
