import { scoreColorStyle } from '@/lib/rating';

export default function ScoreBadge({ percent, count, size = 'md' }: { percent: number | null; count: number; size?: 'sm' | 'md' | 'lg' }) {
  const style = scoreColorStyle(percent);
  const sizes = {
    sm: { box: 'w-12 h-12 text-base', label: 'text-[9px]' },
    md: { box: 'w-16 h-16 text-xl', label: 'text-[10px]' },
    lg: { box: 'w-24 h-24 text-3xl', label: 'text-xs' }
  }[size];

  return (
    <div className={`${sizes.box} rounded-xl flex flex-col items-center justify-center flex-none leading-none`} style={style}>
      <span className="font-display font-extrabold">{percent === null ? '—' : `${percent}%`}</span>
      <span className={`${sizes.label} opacity-90 mt-0.5`}>{count} hlasov</span>
    </div>
  );
}
