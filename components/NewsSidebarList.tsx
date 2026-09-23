import Link from 'next/link';

type NewsItem = { id: string; title: string; slug: string; coverImage: string | null };

export default function NewsSidebarList({ title, items }: { title: string; items: NewsItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="font-display font-bold text-xl text-ink mb-4">{title}</h2>
      <div className="divide-y divide-line border-t border-b border-line">
        {items.map((r) => (
          <Link key={r.id} href={`/news/${r.slug}`} className="group flex items-start gap-3.5 py-4">
            <div className="relative w-20 h-16 rounded-lg overflow-hidden bg-surface flex-none">
              {r.coverImage && (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url('${r.coverImage}')` }}
                />
              )}
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="text-[15px] font-semibold text-ink leading-snug group-hover:text-accent transition-colors line-clamp-3">
                {r.title}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
