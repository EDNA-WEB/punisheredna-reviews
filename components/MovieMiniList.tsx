import Link from 'next/link';

type Item = { id: string; title: string; slug: string; year: string | null; poster: string | null; genre: string | null; country: string | null };

// Zoznam (napr. Nejsledovanější seriály) — rovnaká hlavička ako ostatné boxy
// hlavnej stránky: nadpis vľavo, červené „více“ vpravo.
export default function MovieMiniList({ title, items, moreHref, moreLabel }: { title: string; items: Item[]; moreHref?: string; moreLabel?: string }) {
  return (
    <div className="border border-line rounded-xl bg-card p-4 sm:p-5 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-base text-ink">{title}</h2>
        {moreHref && (
          <Link href={moreHref} className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark">
            {moreLabel || 'více'}
          </Link>
        )}
      </div>
      <div>
        {items.length === 0 ? (
          <p className="text-sm text-muted p-1">Zatím nic k zobrazení.</p>
        ) : (
          <div className="divide-y divide-line">
            {items.map((m) => (
              <Link
                key={m.id}
                href={`/movie/${m.slug}`}
                className="flex items-center gap-3 group rounded-lg px-1.5 py-2 -mx-1.5 hover:bg-surface transition-colors"
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
