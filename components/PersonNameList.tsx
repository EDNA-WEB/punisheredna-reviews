'use client';

import { useState } from 'react';
import Link from 'next/link';

const LIMIT = 5;

export default function PersonNameList({ names, slugByName }: { names: string[]; slugByName: Map<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? names : names.slice(0, LIMIT);
  const hiddenCount = names.length - LIMIT;

  return (
    <>
      {shown.map((name, i) => (
        <span key={name + i}>
          {slugByName.has(name) ? (
            <Link href={`/osobnost/${slugByName.get(name)}`} className="hover:text-accent hover:underline">
              {name}
            </Link>
          ) : (
            name
          )}
          {i < shown.length - 1 && ', '}
        </span>
      ))}
      {!expanded && hiddenCount > 0 && (
        <>
          {', '}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-accent font-semibold hover:underline"
          >
            VIAC (+{hiddenCount})
          </button>
        </>
      )}
    </>
  );
}
