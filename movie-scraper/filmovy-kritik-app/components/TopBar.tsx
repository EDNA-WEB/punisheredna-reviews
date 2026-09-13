import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function TopBar() {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const movies = await prisma.movie.findMany({
    where: {
      nowShowing: true,
      contentType: 'Film',
      // Ak film má vyplnenú premiéru, staršiu ako mesiac, automaticky vypadne z pruhu —
      // filmy bez vyplnenej premiéry (nevieme určiť vek) sa naďalej riadia len ručným prepínačom.
      OR: [{ releaseDate: null }, { releaseDate: { gte: oneMonthAgo } }]
    },
    orderBy: { title: 'asc' },
    take: 14,
    select: { title: true, slug: true }
  });

  if (movies.length === 0) return null;

  return (
    <div className="sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-2 flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap bg-surface border-b border-line text-ink text-[10px] sm:text-xs">
        <svg className="w-3.5 h-3.5 text-accent flex-none" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 8L21 6V4L3 6V8Z" />
          <path d="M3 8H21V18C21 19.1 20.1 20 19 20H5C3.9 20 3 19.1 3 18V8Z" />
        </svg>
        {movies.map((m, i) => (
          <span key={m.slug} className="flex items-center gap-2 flex-none">
            {i > 0 && <span className="text-muted">·</span>}
            <Link href={`/movie/${m.slug}`} className="italic text-muted hover:text-accent transition-colors">
              {m.title}
            </Link>
          </span>
        ))}
      </div>
    </div>
  );
}
