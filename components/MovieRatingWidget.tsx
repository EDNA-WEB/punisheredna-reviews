'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconStar, IconTrash } from './Icons';

export default function MovieRatingWidget({ movieId, initialValue }: { movieId: string; initialValue: number }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [hover, setHover] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const display = hover ?? value;

  function handleClick(e: React.MouseEvent<HTMLDivElement>, starIndex: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    const newValue = starIndex + (isLeftHalf ? 0.5 : 1);
    submit(newValue);
  }

  function handleMove(e: React.MouseEvent<HTMLDivElement>, starIndex: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    setHover(starIndex + (isLeftHalf ? 0.5 : 1));
  }

  async function submit(newValue: number) {
    setLoading(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId, value: newValue })
      });
      if (!res.ok) throw new Error();
      setValue(newValue);
      router.refresh();
    } catch {
      alert('Hodnotenie sa nepodarilo uložiť.');
    } finally {
      setLoading(false);
    }
  }

  async function clearRating() {
    setLoading(true);
    try {
      const res = await fetch('/api/ratings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movieId }) });
      if (!res.ok) throw new Error();
      setValue(0);
      router.refresh();
    } catch {
      alert('Zmazanie zlyhalo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <div className="flex" onMouseLeave={() => setHover(null)}>
          {[0, 1, 2, 3, 4].map((i) => {
            const filled = display >= i + 1;
            const half = !filled && display >= i + 0.5;
            return (
              <div
                key={i}
                className="relative w-5 h-5 cursor-pointer"
                onClick={(e) => handleClick(e, i)}
                onMouseMove={(e) => handleMove(e, i)}
              >
                <IconStar className="absolute inset-0 w-5 h-5 text-line" filled={false} />
                {(filled || half) && (
                  <span className={`absolute inset-0 overflow-hidden ${half ? 'w-1/2' : 'w-full'}`}>
                    <IconStar className="w-5 h-5 text-accent" filled />
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {value > 0 && (
          <button
            onClick={clearRating}
            disabled={loading}
            title="Zmazať hodnotenie"
            aria-label="Zmazať hodnotenie"
            className="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-white hover:bg-danger transition-colors disabled:opacity-50"
          >
            <IconTrash className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
