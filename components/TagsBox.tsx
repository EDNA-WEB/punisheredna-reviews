'use client';

import { useState } from 'react';
import Link from 'next/link';

const INITIAL_COUNT = 20;

export default function TagsBox({ tags }: { tags: string[] }) {
  const [showAll, setShowAll] = useState(false);

  if (tags.length === 0) return null;

  const shown = showAll ? tags : tags.slice(0, INITIAL_COUNT);
  const remaining = tags.length - shown.length;

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="bg-surface px-4 py-2.5 font-display font-bold text-sm text-ink">Tagy</div>
      <div className="p-4 flex flex-wrap gap-2">
        {shown.map((tag) => (
          <Link
            key={tag}
            href={`/recenzie/filter?tag=${encodeURIComponent(tag)}`}
            className="text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 px-3 py-1.5 rounded-full transition-colors"
          >
            {tag}
          </Link>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-xs font-semibold text-accent hover:underline px-1.5 py-1.5"
          >
            viac
          </button>
        )}
      </div>
    </div>
  );
}
