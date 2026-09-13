import Link from 'next/link';

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="border border-line rounded-xl p-10 text-center bg-surface">
      <div className="w-12 h-12 rounded-full bg-card border border-line flex items-center justify-center mx-auto mb-4 text-muted">
        {icon}
      </div>
      <div className="font-display font-bold text-ink mb-1">{title}</div>
      {description && <p className="text-sm text-muted max-w-sm mx-auto">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="inline-block mt-4 bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
