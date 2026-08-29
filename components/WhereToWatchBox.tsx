'use client';

import { useState } from 'react';

type Service = { id: string; name: string; icon: string | null; color: string | null; url: string };

export default function WhereToWatchBox({
  isInCinemas,
  cinemaHref,
  services
}: {
  isInCinemas: boolean;
  cinemaHref: string;
  services: Service[];
}) {
  const [expanded, setExpanded] = useState(false);
  if (!isInCinemas && services.length === 0) return null;

  const MOBILE_LIMIT = 3;
  const DESKTOP_LIMIT = 5;

  return (
    <div className="border border-line rounded-xl overflow-hidden mb-5">
      <div className="bg-surface px-4 py-2.5 font-display font-bold text-sm text-ink">Kde sledovať</div>
      <div className="p-4 space-y-3">
        {isInCinemas && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-ink w-14 flex-none">Kino</span>
            <a
              href={cinemaHref}
              className="inline-flex items-center text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
            >
              Hrajú v kinách
            </a>
          </div>
        )}

        {services.length > 0 && (
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-sm font-bold text-ink w-14 flex-none pt-1">VOD ({services.length})</span>
            <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto pb-0.5">
              {services.map((s, i) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={`flex items-center gap-1.5 flex-none ${
                    expanded ? '' : i < MOBILE_LIMIT ? '' : i < DESKTOP_LIMIT ? 'hidden sm:flex' : 'hidden'
                  }`}
                >
                  {s.icon ? (
                    <span
                      className="w-7 h-7 rounded-full flex-none flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: s.color || '#f3f3f3' }}
                    >
                      <img src={s.icon} alt={s.name} className="w-full h-full object-contain p-0.5" />
                    </span>
                  ) : (
                    <span className="w-7 h-7 rounded-full flex-none" style={{ backgroundColor: s.color || '#ccc' }} />
                  )}
                  <span className="text-sm font-medium text-ink hover:text-accent transition-colors">{s.name}</span>
                </a>
              ))}
              {!expanded && services.length > MOBILE_LIMIT && (
                <button
                  onClick={() => setExpanded(true)}
                  className={`text-accent text-sm font-semibold hover:underline flex-none ${services.length > DESKTOP_LIMIT ? '' : 'sm:hidden'}`}
                >
                  viac
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
