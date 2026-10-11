// Zlaté hviezdy (aj polovičné) pre nový profil — bez hookov, dá sa použiť všade.
const PATH = 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z';

export default function GoldStars({ value, size = 13, className = '' }: { value: number; size?: number; className?: string }) {
  const v = Math.max(0, Math.min(5, Math.round(value * 2) / 2));
  return (
    <span className={`inline-flex items-center gap-[1px] flex-none ${className}`} aria-label={`${v} / 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = v >= i + 1 ? 1 : v >= i + 0.5 ? 0.5 : 0;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path d={PATH} className="pf-star-empty" />
            {fill > 0 && (
              <path d={PATH} fill="#F5B90B" style={fill === 0.5 ? { clipPath: 'inset(0 50% 0 0)' } : undefined} />
            )}
          </svg>
        );
      })}
    </span>
  );
}
