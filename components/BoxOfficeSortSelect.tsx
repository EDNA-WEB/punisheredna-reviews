'use client';

import { useRouter } from 'next/navigation';
import { useT } from './TranslationProvider';

export default function BoxOfficeSortSelect({ currentSort }: { currentSort: string }) {
  const router = useRouter();
  const t = useT();

  return (
    <select
      value={currentSort}
      onChange={(e) => router.push(`/box-office?sort=${e.target.value}`)}
      className="field-input-sm w-auto"
    >
      <option value="trzby">{t('boxoffice.trzby_aktualne')}</option>
      <option value="inflacia">{t('boxoffice.trzby_inflacia')}</option>
      <option value="zisk">{t('boxoffice.najvacsie_zarobky')}</option>
      <option value="prepadaky">{t('boxoffice.najvacsie_prepadaky')}</option>
    </select>
  );
}
