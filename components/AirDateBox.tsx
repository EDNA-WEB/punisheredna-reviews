export default function AirDateBox({ label, date }: { label: string; date: Date | string | null }) {
  if (!date) return null;
  const d = new Date(date);

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="bg-surface px-4 py-2.5 font-display font-bold text-sm text-ink">Vysielanie</div>
      <div className="p-4">
        <div className="text-sm font-semibold text-ink">{label}</div>
        <div className="text-xs text-muted">
          {String(d.getDate()).padStart(2, '0')}.{String(d.getMonth() + 1).padStart(2, '0')}.{d.getFullYear()}
        </div>
      </div>
    </div>
  );
}
