import Link from 'next/link';
import { IconKey } from './Icons';

export default function AdminQuickEditButton({ movieId }: { movieId: string }) {
  return (
    <Link
      href={`/admin/movies/${movieId}/edit`}
      aria-label="Rýchlo upraviť (admin)"
      title="Rýchlo upraviť (admin)"
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-night text-white shadow-lg border border-white/10 flex items-center justify-center hover:bg-accent transition-colors"
    >
      <IconKey className="w-5 h-5" />
    </Link>
  );
}
