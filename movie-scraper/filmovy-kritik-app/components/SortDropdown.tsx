'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const OPTIONS = [
  { value: 'najnovsie', label: 'Najnovšie' },
  { value: 'najstarsie', label: 'Najstaršie' },
  { value: 'najlepsie', label: 'Najlepšie hodnotené' },
  { value: 'najhorsie', label: 'Najhoršie hodnotené' }
];

export default function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('sort') || 'najnovsie';

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    params.delete('page');
    router.push(`/recenzie?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-line text-ink hover:border-night bg-card cursor-pointer flex-none"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
