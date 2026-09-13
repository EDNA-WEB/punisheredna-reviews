export default function Loading() {
  return (
    <div className="pt-10 max-w-2xl animate-pulse">
      <div className="aspect-video bg-surface rounded-xl mb-6" />
      <div className="h-8 bg-surface rounded-lg w-4/5 mb-3" />
      <div className="h-4 bg-surface rounded-lg w-1/2 mb-6" />
      <div className="space-y-3">
        <div className="h-4 bg-surface rounded-lg w-full" />
        <div className="h-4 bg-surface rounded-lg w-full" />
        <div className="h-4 bg-surface rounded-lg w-4/5" />
      </div>
    </div>
  );
}
