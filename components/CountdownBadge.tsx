function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function CountdownBadge({ date }: { date: Date | string }) {
  const days = daysUntil(new Date(date));
  const label = days <= 0 ? 'Dnes' : days === 1 ? 'Zajtra' : `${days}`;
  const sub = days <= 1 ? '' : 'dní';

  return (
    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-accent-dark text-white flex flex-col items-center justify-center flex-none leading-none shadow-sm">
      <span className="font-display font-extrabold text-lg">{label}</span>
      {sub && <span className="text-[9px] opacity-85 mt-0.5">{sub}</span>}
    </div>
  );
}
