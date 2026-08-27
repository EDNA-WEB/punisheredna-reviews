type Tone = 'neutral' | 'success' | 'warning' | 'accent' | 'dark' | 'danger';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-surface border border-line text-ink',
  success: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
  warning: 'bg-amber-50 border border-amber-300 text-amber-800',
  accent: 'bg-accent/10 border border-accent/20 text-accent',
  dark: 'bg-night text-white',
  danger: 'bg-danger/10 border border-danger/30 text-danger'
};

export default function Badge({
  children,
  tone = 'neutral',
  size = 'sm',
  className = '',
  title
}: {
  children: React.ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
}) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5';
  return (
    <span title={title} className={`inline-flex items-center gap-1 font-semibold rounded-full ${sizeClasses} ${TONE_CLASSES[tone]} ${className}`}>
      {children}
    </span>
  );
}
