// Jednoduchá, opakovane použiteľná "kostra" stránky počas načítavania — zabraňuje
// bielej prázdnej obrazovke pri pomalších dátových dopytoch (napr. profil filmu).
export function ProfileSkeleton() {
  return (
    <div className="pt-8 grid md:grid-cols-[1fr_260px] gap-8 mb-8 animate-pulse">
      <div>
        <div className="flex gap-5 mb-4 border border-line rounded-xl p-4">
          <div className="w-32 sm:w-40 flex-none rounded-xl bg-surface aspect-[2/3]" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-7 bg-surface rounded-lg w-3/4" />
            <div className="h-4 bg-surface rounded-lg w-1/3" />
            <div className="h-4 bg-surface rounded-lg w-1/2" />
            <div className="h-4 bg-surface rounded-lg w-2/3" />
          </div>
        </div>
        <div className="flex gap-3 mb-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 bg-surface rounded-full" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-surface rounded-lg w-full" />
          <div className="h-4 bg-surface rounded-lg w-full" />
          <div className="h-4 bg-surface rounded-lg w-4/5" />
        </div>
      </div>
      <div className="h-40 bg-surface rounded-xl" />
    </div>
  );
}

export function GridSkeleton({ items = 12 }: { items?: number }) {
  return (
    <div className="pt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] bg-surface rounded-xl mb-2.5" />
          <div className="h-4 bg-surface rounded-lg w-4/5 mb-1.5" />
          <div className="h-3 bg-surface rounded-lg w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="pt-8 space-y-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border border-line rounded-xl p-4 flex gap-4">
          <div className="w-16 h-16 rounded-lg bg-surface flex-none" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 bg-surface rounded-lg w-1/3" />
            <div className="h-3 bg-surface rounded-lg w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
