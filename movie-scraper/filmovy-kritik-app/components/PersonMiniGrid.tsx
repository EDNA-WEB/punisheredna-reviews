import Link from 'next/link';

type Item = { id: string; name: string; slug: string; photo: string | null };

export default function PersonMiniGrid({
  title,
  items,
  moreHref,
  noWrapper
}: {
  title: string;
  items: Item[];
  moreHref?: string;
  noWrapper?: boolean;
}) {
  if (items.length === 0) return null;

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm text-ink">{title}</h3>
        {moreHref && (
          <Link href={moreHref} className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark">
            viac
          </Link>
        )}
      </div>
      <div className="flex gap-x-5 gap-y-4 overflow-x-auto snap-x snap-mandatory pb-1 max-w-full">
        {items.map((p, i) => (
          <Link
            key={p.id}
            href={`/osobnost/${p.slug}`}
            className={`flex-none snap-start flex-col items-center text-center w-20 group ${i < 5 ? 'flex' : 'hidden sm:flex'}`}
          >
            <div className="relative mb-1.5">
              <div
                className="w-16 h-16 rounded-lg bg-line bg-cover bg-center shadow-sm group-hover:shadow-md group-hover:ring-2 group-hover:ring-accent transition-all"
                style={p.photo ? { backgroundImage: `url('${p.photo}')` } : undefined}
              />
            </div>
            <span className="text-xs font-semibold text-ink leading-tight group-hover:text-accent transition-colors">{p.name}</span>
          </Link>
        ))}
      </div>
    </>
  );

  if (noWrapper) return <div className="min-w-0">{content}</div>;

  return <div className="border border-line rounded-xl p-4 bg-card min-w-0">{content}</div>;
}
