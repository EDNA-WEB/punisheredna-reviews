'use client';

import { useRouter } from 'next/navigation';
import { useT } from './TranslationProvider';

export default function KinoYearFilter({ year }: { year: number }) {
  const router = useRouter();
  const t = useT();
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-semibold text-ink">{t('kino.rok')}:</label>
      <select
        className="field-input-sm w-auto"
        value={year}
        onChange={(e) => router.push(`/kino/rocny-prehlad?year=${e.target.value}`)}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
