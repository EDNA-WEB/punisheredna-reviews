import Link from 'next/link';
import { IconChevronLeft, IconChevronRight } from './Icons';

export default function Pagination({ page, totalPages, basePath }: { page: number; totalPages: number; basePath: string }) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const separator = basePath.includes('?') ? '&' : '?';
    return `${basePath}${separator}page=${p}`;
  }

  // Pri veľkom počte strán ukážeme len okolie aktuálnej strany + prvú a
  // poslednú, s "…" medzerami — nech to nezaberá celú šírku obrazovky.
  const pages: (number | 'gap')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== 'gap') {
      pages.push('gap');
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          aria-label="Predchádzajúca strana"
          className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink hover:border-accent hover:text-accent"
        >
          <IconChevronLeft className="w-4 h-4" />
        </Link>
      ) : (
        <span className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink opacity-40">
          <IconChevronLeft className="w-4 h-4" />
        </span>
      )}

      {pages.map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="w-8 h-8 flex items-center justify-center text-sm text-muted">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            className={`w-8 h-8 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors ${
              p === page ? 'bg-accent text-white' : 'border border-line text-ink hover:border-accent hover:text-accent'
            }`}
          >
            {p}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link
          href={hrefFor(page + 1)}
          aria-label="Ďalšia strana"
          className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink hover:border-accent hover:text-accent"
        >
          <IconChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink opacity-40">
          <IconChevronRight className="w-4 h-4" />
        </span>
      )}
    </div>
  );
}
