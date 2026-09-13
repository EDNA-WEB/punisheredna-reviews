import Link from 'next/link';

export default function TagsBox({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="bg-surface px-4 py-2.5 font-display font-bold text-sm text-ink">Tagy</div>
      <div className="p-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/recenzie/filter?tag=${encodeURIComponent(tag)}`}
            className="text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 px-3 py-1.5 rounded-full transition-colors"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}
