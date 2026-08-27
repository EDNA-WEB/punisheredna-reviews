'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Restrictions = { reviewsDisabled: boolean; ratingsDisabled: boolean; commentsDisabled: boolean };

export default function UserRestrictionsToggle({ id, initial }: { id: string; initial: Restrictions }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function toggle(key: keyof Restrictions) {
    const next = !state[key];
    setLoadingKey(key);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next })
      });
      if (!res.ok) throw new Error();
      setState((prev) => ({ ...prev, [key]: next }));
      router.refresh();
    } catch {
      alert('Akcia zlyhala. Skús to prosím znova.');
    } finally {
      setLoadingKey(null);
    }
  }

  const items: { key: keyof Restrictions; onLabel: string; offLabel: string }[] = [
    { key: 'reviewsDisabled', onLabel: 'Zakázané recenzie', offLabel: 'Zakázať recenzie' },
    { key: 'ratingsDisabled', onLabel: 'Zakázané hodnotenia', offLabel: 'Zakázať hodnotenia' },
    { key: 'commentsDisabled', onLabel: 'Zakázané komentáre', offLabel: 'Zakázať komentáre' }
  ];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {items.map((item) => {
        const active = state[item.key];
        return (
          <button
            key={item.key}
            onClick={() => toggle(item.key)}
            disabled={loadingKey === item.key}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border disabled:opacity-50 whitespace-nowrap ${
              active ? 'text-white bg-night border-night hover:bg-night/80' : 'text-muted border-line hover:border-danger hover:text-danger'
            }`}
          >
            {active ? item.onLabel : item.offLabel}
          </button>
        );
      })}
    </div>
  );
}
