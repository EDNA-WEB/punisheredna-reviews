type LinkItem = { id: string; name: string; icon: string | null; color: string | null; url: string };

export default function MovieLinksBox({ links }: { links: LinkItem[] }) {
  if (links.length === 0) return null;

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="bg-surface px-4 py-2.5 font-display font-bold text-sm text-ink">Odkazy</div>
      <div className="p-4 flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 pl-1.5 pr-3 py-1.5 rounded-full transition-colors"
          >
            {l.icon ? (
              <span
                className="w-5 h-5 rounded-full flex-none flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: l.color || '#f3f3f3' }}
              >
                <img src={l.icon} alt="" className="w-full h-full object-contain p-0.5" />
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full flex-none" style={{ backgroundColor: l.color || '#ccc' }} />
            )}
            {l.name}
          </a>
        ))}
      </div>
    </div>
  );
}
