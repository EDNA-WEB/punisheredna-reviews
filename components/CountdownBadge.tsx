function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function CountdownBadge({ date, size = 'md' }: { date: Date | string; size?: 'sm' | 'md' }) {
  const days = daysUntil(new Date(date));
  const label = days <= 0 ? 'DNES' : days === 1 ? 'ZAJTRA' : `${days}`;
  const sub = days <= 1 ? '' : days < 5 ? 'dni' : 'dní';
  const isSoon = days <= 3;

  if (size === 'sm') {
    return (
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-white flex flex-col items-center justify-center flex-none leading-none shadow-sm">
        <span className="font-display font-extrabold text-lg">{label}</span>
        {sub && <span className="text-[9px] opacity-85 mt-0.5">{sub}</span>}
      </div>
    );
  }

  return (
    <div
      className={`w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-md border-2 border-white/20 ${
        isSoon ? 'bg-gradient-to-br from-amber-500 to-accent text-white' : 'bg-night/90 text-white backdrop-blur-sm'
      }`}
    >
      <span className="font-display font-extrabold text-xl">{label}</span>
      {sub && <span className="text-[9px] uppercase tracking-wide opacity-80 -mt-0.5">{sub}</span>}
    </div>
  );
}
