export default function CriticBadge({ size = 'w-4 h-4', label = true }: { size?: string; label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-accent" title="Overený kritik">
      <svg className={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1.5l2.24 2.06 3.02-.5.72 3-2.3 2 2.3 2-.72 3-3.02-.5L12 14.6l-2.24-2.04-3.02.5-.72-3 2.3-2-2.3-2 .72-3 3.02.5L12 1.5Z" />
        <circle cx="12" cy="8" r="3.3" fill="white" />
        <path d="M9.5 8l1.7 1.7L14.7 6" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label && <span className="text-[11px] font-semibold">Overený kritik</span>}
    </span>
  );
}
