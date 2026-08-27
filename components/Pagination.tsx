import Link from 'next/link';
import { IconChevronLeft, IconChevronRight } from './Icons';

function buildPageList(current: number, total: number): (number | '…')[] {
  const pages: (number | '…')[] = [];
  const add = (p: number) => pages.push(p);

  add(1);
  if (current > 3) pages.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) add(p);
  if (current < total - 2) pages.push('…');
  if (total > 1) add(total);

  return pages;
}

export default function Pagination({ page, totalPages, basePath }: { page: number; totalPages: number; basePath: string }) {
  if (totalPages <= 1) return null;
  const pages = buildPageList(page, totalPages);
  const href = (p: number) => `${basePath}${basePath.includes('?') ? '&' : '?'}page=${p}`;

  return (
    <div className="flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          aria-label="Predchádzajúca strana"
          className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-ink hover:border-accent hover:text-accent transition-colors flex-none"
        >
          <IconChevronLeft className="w-4 h-4" />
        </Link>
      ) : (
        <span className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-line flex-none">
          <IconChevronLeft className="w-4 h-4" />
        </span>
      )}

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-muted text-sm select-none">…</span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors flex-none ${
              p === page ? 'bg-accent text-white' : 'text-ink border border-line hover:border-accent hover:text-accent'
            }`}
          >
            {p}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          aria-label="Ďalšia strana"
          className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-ink hover:border-accent hover:text-accent transition-colors flex-none"
        >
          <IconChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-line flex-none">
          <IconChevronRight className="w-4 h-4" />
        </span>
      )}
    </div>
  );
}
