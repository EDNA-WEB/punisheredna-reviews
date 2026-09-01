'use client';

import ReviewForm from './ReviewForm';

export default function EditReviewModal({
  movieId,
  apiBase,
  title,
  reviewId,
  initialBody,
  initialRating,
  onClose
}: {
  movieId?: string;
  apiBase?: string;
  title: string;
  reviewId: string | null;
  initialBody: string;
  initialRating: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-night/70 p-4 overflow-y-auto">
      <div className="bg-card rounded-xl w-full max-w-xl my-8 relative p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-surface transition-colors"
          aria-label="Zavrieť"
        >
          ✕
        </button>
        <h2 className="font-display font-extrabold text-2xl text-ink mb-1">{reviewId ? 'Upraviť recenziu' : 'Napísať recenziu'}</h2>
        <p className="text-muted mb-6">{title}</p>
        <ReviewForm
          initial={{ id: reviewId || undefined, movieId, body: initialBody, rating: initialRating }}
          movieLocked
          apiBase={apiBase}
          onSuccess={onClose}
        />
      </div>
    </div>
  );
}
