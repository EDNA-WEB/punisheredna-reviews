export default function Loading() {
  return (
    <div className="pt-8 animate-pulse">
      <div className="h-8 bg-surface rounded-lg w-40 mb-2" />
      <div className="h-4 bg-surface rounded-lg w-64 mb-8" />
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="h-10 bg-surface rounded-full" style={{ width: `${70 + (i % 4) * 20}px` }} />
        ))}
      </div>
    </div>
  );
}
