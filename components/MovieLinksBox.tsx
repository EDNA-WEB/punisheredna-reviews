'use client';

import { useState } from 'react';

type LinkItem = { id: string; name: string; icon: string | null; color: string | null; url: string };

export default function MovieLinksBox({ links }: { links: LinkItem[] }) {
  const [expanded, setExpanded] = useState(false);
  if (links.length === 0) return null;

  const MOBILE_LIMIT = 3;
  const DESKTOP_LIMIT = 5;

  return (
    <div className="border border-line rounded-xl overflow-hidden mb-5">
      <div className="bg-surface px-4 py-2.5 font-display font-bold text-sm text-ink">Odkazy</div>
      <div className="p-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-0.5">
          {links.map((l, i) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={`flex items-center gap-1.5 flex-none ${
                expanded ? '' : i < MOBILE_LIMIT ? '' : i < DESKTOP_LIMIT ? 'hidden sm:flex' : 'hidden'
              }`}
            >
              {l.icon ? (
                <span
                  className="w-7 h-7 rounded-full flex-none flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: l.color || '#f3f3f3' }}
                >
                  <img src={l.icon} alt={l.name} className="w-full h-full object-contain p-0.5" />
                </span>
              ) : (
                <span className="w-7 h-7 rounded-full flex-none" style={{ backgroundColor: l.color || '#ccc' }} />
              )}
              <span className="text-sm font-medium text-ink hover:text-accent transition-colors">{l.name}</span>
            </a>
          ))}
          {!expanded && links.length > MOBILE_LIMIT && (
            <button
              onClick={() => setExpanded(true)}
              className={`text-accent text-sm font-semibold hover:underline flex-none ${links.length > DESKTOP_LIMIT ? '' : 'sm:hidden'}`}
            >
              viac
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
