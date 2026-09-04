'use client';

import { useState } from 'react';
import Link from 'next/link';

type Review = { id: string; rating: number; body: string | null; createdAt: Date | string; user: { name: string; avatar: string | null } };

export default function ShopReviewsSection({
  productId,
  initialReviews,
  isLoggedIn,
  myExistingReview
}: {
  productId: string;
  initialReviews: Review[];
  isLoggedIn: boolean;
  myExistingReview: Review | null;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(myExistingReview?.rating || 0);
  const [body, setBody] = useState(myExistingReview?.body || '');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  async function submitReview() {
    if (!rating) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/shop/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, body })
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setReviews((prev) => {
        const withoutMine = prev.filter((r) => r.id !== data.id);
        return [data, ...withoutMine];
      });
      setShowForm(false);
    } catch {
      alert('Uloženie recenzie zlyhalo. Skús to prosím znova.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-10 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">Recenzie</h2>
          {avg !== null ? (
            <div className="flex items-center gap-2 text-sm mt-1">
              <span className="text-amber-500">{'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}</span>
              <span className="font-semibold text-ink">{avg.toFixed(1)}</span>
              <span className="text-muted">({reviews.length})</span>
            </div>
          ) : (
            <p className="text-sm text-muted mt-1">Zatiaľ žiadne recenzie.</p>
          )}
        </div>
        {isLoggedIn ? (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm font-semibold text-accent hover:underline flex-none"
          >
            {myExistingReview ? 'Upraviť moju recenziu' : 'Napísať recenziu'}
          </button>
        ) : (
          <Link href="/login" className="text-sm font-semibold text-accent hover:underline flex-none">
            Prihlás sa a napíš recenziu
          </Link>
        )}
      </div>

      {showForm && (
        <div className="border border-line rounded-xl p-4 mb-4 space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className="text-2xl leading-none">
                {n <= rating ? '★' : '☆'}
                <span className="sr-only">{n} hviezdičiek</span>
              </button>
            ))}
          </div>
          <textarea
            className="field-input-sm w-full min-h-[70px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ako si bol spokojný so službou? (voliteľné)"
          />
          <button
            onClick={submitReview}
            disabled={saving || !rating}
            className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50"
          >
            {saving ? 'Ukladám…' : 'Uložiť recenziu'}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-line pb-4 last:border-b-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-ink">{r.user.name}</span>
              <span className="text-amber-500 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
            </div>
            {r.body && <p className="text-sm text-ink leading-relaxed">{r.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
