import Link from 'next/link';

type NewsItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImage: string | null;
  createdAt: Date;
};

export default function RelatedNewsBox({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="border border-line rounded-xl overflow-hidden mb-8">
      <div className="bg-surface px-4 py-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-sm text-ink">Súvisiace novinky</h3>
        <Link
          href="/novinky"
          className="text-white text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-accent hover:bg-accent-dark transition-colors flex-none"
        >
          viac
        </Link>
      </div>
      <div className="divide-y divide-line sm:grid sm:grid-cols-2 sm:divide-y-0">
        {items.map((n, i) => (
          <Link
            key={n.id}
            href={`/news/${n.slug}`}
            className={`flex gap-3 p-4 hover:bg-surface transition-colors sm:border-line ${i < 2 ? 'sm:border-b' : ''} ${i % 2 === 0 ? 'sm:border-r' : ''}`}
          >
            <div
              className="w-16 h-16 rounded-lg bg-surface bg-cover bg-center flex-none"
              style={n.coverImage ? { backgroundImage: `url('${n.coverImage}')` } : undefined}
            />
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold text-sm text-accent leading-snug mb-1 line-clamp-2">{n.title}</div>
              <div className="text-xs text-muted mb-1">{n.createdAt.toLocaleDateString('sk-SK')}</div>
              <p className="text-xs text-muted line-clamp-2">
                {n.summary} <span className="text-accent font-semibold">viac</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
