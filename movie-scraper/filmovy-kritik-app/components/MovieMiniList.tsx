import Link from 'next/link';

type Item = { id: string; title: string; slug: string; year: string | null; poster: string | null; genre: string | null; country: string | null };

export default function MovieMiniList({ title, items }: { title: string; items: Item[] }) {
  return (
    <div className="border border-line rounded-xl overflow-hidden bg-card">
      <div className="px-4 py-3 bg-surface border-b border-line">
        <h3 className="font-display font-bold text-sm text-ink">{title}</h3>
      </div>
      <div className="p-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted p-1">Zatiaľ nič na zobrazenie.</p>
        ) : (
          <div className="space-y-1">
            {items.map((m) => (
              <Link
                key={m.id}
                href={`/movie/${m.slug}`}
                className="flex items-center gap-3 group rounded-lg p-1.5 -mx-1.5 hover:bg-surface transition-colors"
              >
                <div className="relative w-9 h-12 rounded-md overflow-hidden bg-surface flex-none shadow-sm">
                  {m.poster && (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                      style={{ backgroundImage: `url('${m.poster}')` }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink group-hover:text-accent transition-colors truncate">
                    {m.title} {m.year && <span className="text-muted font-normal">· {m.year}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {m.genre && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                        {m.genre}
                      </span>
                    )}
                    {m.country && <span className="text-[11px] text-muted truncate">{m.country}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
