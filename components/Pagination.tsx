'use client';

import { IconChevronLeft, IconChevronRight } from './Icons';

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  loading
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}) {
  if (totalPages <= 1) return null;

  // Pri veľkom počte strán ukážeme len okolie aktuálnej strany + prvú a
  // poslednú, s "…" medzerami — nech to nezaberá celú šírku obrazovky.
  const pages: (number | 'gap')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== 'gap') {
      pages.push('gap');
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || loading}
        aria-label="Predchádzajúca strana"
        className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink"
      >
        <IconChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="w-8 h-8 flex items-center justify-center text-sm text-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            disabled={loading}
            className={`w-8 h-8 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors ${
              p === currentPage ? 'bg-accent text-white' : 'border border-line text-ink hover:border-accent hover:text-accent'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || loading}
        aria-label="Ďalšia strana"
        className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink"
      >
        <IconChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
