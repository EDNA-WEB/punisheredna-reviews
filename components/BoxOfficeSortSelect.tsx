'use client';

import { useRouter } from 'next/navigation';

export default function BoxOfficeSortSelect({ currentSort }: { currentSort: string }) {
  const router = useRouter();

  return (
    <select
      value={currentSort}
      onChange={(e) => router.push(`/box-office?sort=${e.target.value}`)}
      className="field-input-sm w-auto"
    >
      <option value="trzby">Najvyššie tržby (aktuálna hodnota $)</option>
      <option value="inflacia">Najvyššie tržby (prepočítané na dnešnú hodnotu peňazí)</option>
      <option value="zisk">Najvyšší zisk štúdia</option>
    </select>
  );
}
