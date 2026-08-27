'use client';

import { useRouter } from 'next/navigation';
import { useT } from './TranslationProvider';

export default function KinoFilter({ month, year }: { month: number; year: number }) {
  const router = useRouter();
  const t = useT();
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: t(`month.${i + 1}`) }));

  function go(m: number, y: number) {
    router.push(`/kino?month=${m}&year=${y}`);
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-ink">{t('kino.mesiac')}:</label>
        <select className="field-input-sm w-auto" value={month} onChange={(e) => go(Number(e.target.value), year)}>
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-ink">{t('kino.rok')}:</label>
        <select className="field-input-sm w-auto" value={year} onChange={(e) => go(month, Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
