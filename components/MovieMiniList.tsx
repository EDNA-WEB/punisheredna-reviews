import Link from 'next/link';

type Item = { id: string; title: string; slug: string; year: string | null; poster: string | null; genre: string | null; country: string | null };

export default function MovieMiniList({ title, items }: { title: string; items: Item[] }) {
  return (
    <div className="border border-line rounded-xl p-4 bg-card">
      <h3 className="font-display font-bold text-sm text-ink mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Zatiaľ nič na zobrazenie.</p>
      ) : (
        <div className="space-y-3">
          {items.map((m, i) => (
            <Link key={m.id} href={`/movie/${m.slug}`} className="flex items-center gap-3 group">
              <span className="w-5 text-center text-xs font-extrabold text-accent flex-none">{i + 1}</span>
              <div
                className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none"
                style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink group-hover:text-accent transition-colors truncate">
                  {m.title} {m.year && <span className="text-muted font-normal">· {m.year}</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {m.genre && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface border border-line text-muted">
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
  );
}
