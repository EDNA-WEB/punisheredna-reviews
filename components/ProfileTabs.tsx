'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconUser, IconEdit } from './Icons';
import CriticBadge from './CriticBadge';
import StarRating from './StarRating';
import { useT } from './TranslationProvider';
import { displayUserName } from '@/lib/deletedUser';
import ProfileMovieLists from './ProfileMovieLists';

type ReviewT = { id: string; body?: string; createdAt: string; movie: { title: string; slug: string; poster: string | null; year?: string | null } };
type RatingT = { id: string; value: number; createdAt: string; movie: { title: string; slug: string; poster: string | null; year: string | null; releaseDate: string | null } };
type CommentT = {
  id: string;
  body: string;
  createdAt: string;
  review: { movie: { title: string; slug: string } } | null;
  news: { title: string; slug: string } | null;
  movie: { title: string; slug: string } | null;
};
type Fan = { id: string; name: string; avatar: string | null; role: string; membershipUntil?: string | Date | null };

type BlogPostT = { id: string; title: string; coverImage: string | null; createdAt: string; published: boolean; isDraft?: boolean };

function daysSincePremiere(ratedAt: string, releaseDate: string | null): number | null {
  if (!releaseDate) return null;
  const diffMs = new Date(ratedAt).getTime() - new Date(releaseDate).getTime();
  return Math.round(diffMs / 86_400_000);
}

export default function ProfileTabs({
  userId,
  reviews,
  comments,
  fans,
  latestRatings = [],
  bio,
  isOwn,
  blogPosts = [],
  movieLists = []
}: {
  userId: string;
  reviews: ReviewT[];
  comments: CommentT[];
  fans: Fan[];
  latestRatings?: RatingT[];
  bio?: string | null;
  isOwn?: boolean;
  blogPosts?: BlogPostT[];
  movieLists?: { id: string; title: string; itemCount: number; items: { slug: string; title: string; poster: string | null; year: string | null }[] }[];
}) {
  const primaryTabs = [
    { key: 'prehlad', label: 'Prehľad' },
    { key: 'o_mne', label: 'O mne' },
    { key: 'hodnotenie', label: 'Hodnotenie' },
    { key: 'reviews', label: 'Recenzie' },
    { key: 'blog', label: 'Blog', desktopOnly: true },
    { key: 'seznamy', label: 'Zoznamy', desktopOnly: true }
  ];
  const moreTabs = [
    { key: 'comments', label: 'Komentáre' },
    { key: 'fans', label: 'Fanúšikovia' }
  ];
  const allTabs = [...primaryTabs, ...moreTabs];

  const [active, setActive] = useState('prehlad');
  const [reviewList, setReviewList] = useState(reviews);
  const [reviewsHasMore, setReviewsHasMore] = useState(reviews.length >= 20);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [ratingList, setRatingList] = useState(latestRatings);
  const [ratingsHasMore, setRatingsHasMore] = useState(latestRatings.length >= 20);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [loadingRatings, setLoadingRatings] = useState(false);

  async function loadMoreReviews() {
    setLoadingReviews(true);
    try {
      const nextPage = reviewsPage + 1;
      const res = await fetch(`/api/users/${userId}/reviews?page=${nextPage}`);
      const data = await res.json();
      setReviewList((prev) => [...prev, ...data.reviews]);
      setReviewsHasMore(data.hasMore);
      setReviewsPage(nextPage);
    } finally {
      setLoadingReviews(false);
    }
  }

  async function loadMoreRatings() {
    setLoadingRatings(true);
    try {
      const nextPage = ratingsPage + 1;
      const res = await fetch(`/api/users/${userId}/ratings?page=${nextPage}`);
      const data = await res.json();
      setRatingList((prev) => [...prev, ...data.ratings]);
      setRatingsHasMore(data.hasMore);
      setRatingsPage(nextPage);
    } finally {
      setLoadingRatings(false);
    }
  }
  const router = useRouter();
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState(bio || '');
  const [bioSaving, setBioSaving] = useState(false);
  const [bioError, setBioError] = useState('');

  async function saveBio() {
    setBioSaving(true);
    setBioError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: bioText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setEditingBio(false);
      router.refresh();
    } catch (err: any) {
      setBioError(err.message);
    } finally {
      setBioSaving(false);
    }
  }
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const t = useT();
  const activeIsInMore = moreTabs.some((tb) => tb.key === active);
  const activeMoreTab = moreTabs.find((tb) => tb.key === active);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="pt-6">
      <div className="flex items-stretch gap-1 mb-6 border-b border-line">
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap min-w-0">
          {primaryTabs.map((tb: any) => (
            <button
              key={tb.key}
              onClick={() => setActive(tb.key)}
              className={`${tb.desktopOnly ? 'hidden sm:inline-flex' : ''} text-sm font-semibold px-3.5 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active === tb.key ? 'text-ink border-accent' : 'text-muted border-transparent hover:text-ink'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <div className="relative flex-none" ref={moreRef}>
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`text-sm font-semibold px-3.5 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeIsInMore ? 'text-ink border-accent' : 'text-muted border-transparent hover:text-ink'
            }`}
          >
            {activeIsInMore ? activeMoreTab?.label : 'Ďalší'} <span className="text-[10px]">▾</span>
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-line bg-card shadow-lg overflow-hidden z-20">
              {moreTabs.map((tb) => (
                <button
                  key={tb.key}
                  onClick={() => {
                    setActive(tb.key);
                    setMoreOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surface"
                >
                  {tb.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {active === 'prehlad' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between bg-surface border border-line rounded-t-xl px-4 py-2.5">
              <span className="text-sm font-bold text-ink">Posledné recenzie{reviews.length > 0 ? ` (${reviews.length})` : ''}</span>
              {reviews.length > 3 && (
                <button onClick={() => setActive('reviews')} className="text-[11px] font-bold text-white bg-accent px-3 py-1 rounded-full hover:bg-accent-dark">
                  VIAC
                </button>
              )}
            </div>
            <div className="border border-t-0 border-line rounded-b-xl divide-y divide-line">
              {reviews.length === 0 ? (
                <p className="text-sm text-muted p-4">Zatiaľ žiadne recenzie.</p>
              ) : (
                reviews.slice(0, 3).map((r) => (
                  <Link key={r.id} href={`/movie/${r.movie.slug}`} className="flex gap-3 p-4 hover:bg-surface transition-colors">
                    <div className="w-12 h-16 rounded-md bg-surface bg-cover bg-center flex-none" style={r.movie.poster ? { backgroundImage: `url('${r.movie.poster}')` } : undefined} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink">
                        {r.movie.title} {r.movie.year && <span className="text-muted font-normal">{r.movie.year}</span>}
                      </div>
                      {r.body && <p className="text-xs text-muted line-clamp-2 mt-1">{r.body.replace(/[#*_`>]/g, '')}</p>}
                      <div className="text-[11px] text-muted mt-1">{new Date(r.createdAt).toLocaleDateString('sk-SK')}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between bg-surface border border-line rounded-t-xl px-4 py-2.5">
              <span className="text-sm font-bold text-ink">Posledné hodnotenia</span>
              {latestRatings.length > 0 && (
                <button onClick={() => setActive('hodnotenie')} className="text-[11px] font-bold text-white bg-accent px-3 py-1 rounded-full hover:bg-accent-dark">
                  VIAC
                </button>
              )}
            </div>
            <div className="border border-t-0 border-line rounded-b-xl divide-y divide-line">
              {latestRatings.length === 0 ? (
                <p className="text-sm text-muted p-4">Zatiaľ žiadne hodnotenia.</p>
              ) : (
                latestRatings.map((r) => (
                  <Link key={r.id} href={`/movie/${r.movie.slug}`} className="flex items-center gap-3 p-3 hover:bg-surface transition-colors">
                    <div className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none" style={r.movie.poster ? { backgroundImage: `url('${r.movie.poster}')` } : undefined} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-ink truncate">
                        {r.movie.title} {r.movie.year && <span className="text-muted">{r.movie.year}</span>}
                      </div>
                    </div>
                    <StarRating rating={r.value} size="w-3 h-3" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {active === 'o_mne' && (
        <div>
          {editingBio ? (
            <div>
              <textarea
                className="field-input-sm min-h-[120px] max-w-md"
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                maxLength={1000}
                placeholder="Napíš pár viet o sebe…"
                autoFocus
              />
              {bioError && <div className="text-danger text-xs mt-1.5">{bioError}</div>}
              <div className="flex items-center gap-2.5 mt-2">
                <button
                  onClick={saveBio}
                  disabled={bioSaving}
                  className="bg-accent text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
                >
                  {bioSaving ? 'Ukladám…' : 'Uložiť'}
                </button>
                <button
                  onClick={() => {
                    setEditingBio(false);
                    setBioText(bio || '');
                    setBioError('');
                  }}
                  className="text-xs text-muted hover:text-ink"
                >
                  Zrušiť
                </button>
              </div>
            </div>
          ) : bio ? (
            <div className="flex items-start gap-2">
              <p className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap flex-1">{bio}</p>
              {isOwn && (
                <button
                  onClick={() => setEditingBio(true)}
                  title="Upraviť"
                  aria-label="Upraviť"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted border border-line hover:text-accent hover:border-accent flex-none"
                >
                  <IconEdit className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted">
                {isOwn ? 'Ešte si o sebe nič nenapísal(a).' : 'Zatiaľ o sebe nič nenapísal(a).'}
              </p>
              {isOwn && (
                <button
                  onClick={() => setEditingBio(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mt-2"
                >
                  <IconEdit className="w-3.5 h-3.5" />
                  Napísať o sebe
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {active === 'hodnotenie' && (
        <div className="space-y-2">
          {ratingList.length === 0 ? (
            <p className="text-sm text-muted">Zatiaľ žiadne hodnotenia.</p>
          ) : (
            ratingList.map((r) => {
              const days = daysSincePremiere(r.createdAt, r.movie.releaseDate);
              return (
                <Link key={r.id} href={`/movie/${r.movie.slug}`} className="flex items-center gap-3 border border-line rounded-xl p-3 hover:border-accent">
                  <div className="w-10 h-14 rounded-md bg-surface bg-cover bg-center flex-none" style={r.movie.poster ? { backgroundImage: `url('${r.movie.poster}')` } : undefined} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink truncate">
                      {r.movie.title} {r.movie.year && <span className="text-muted font-normal">{r.movie.year}</span>}
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      Ohodnotené {new Date(r.createdAt).toLocaleDateString('sk-SK')}
                      {days !== null && (
                        <> · {days === 0 ? 'v deň premiéry' : days > 0 ? `${days}. deň od premiéry` : `${Math.abs(days)} dní pred premiérou`}</>
                      )}
                    </div>
                  </div>
                  <StarRating rating={r.value} size="w-3.5 h-3.5" />
                </Link>
              );
            })
          )}
          {ratingsHasMore && (
            <button
              onClick={loadMoreRatings}
              disabled={loadingRatings}
              className="w-full text-sm font-semibold text-accent border border-line rounded-xl py-2.5 hover:border-accent disabled:opacity-50"
            >
              {loadingRatings ? 'Načítavam…' : 'Načítať ďalšie'}
            </button>
          )}
        </div>
      )}

      {active === 'reviews' && (
        <div className="space-y-4">
          {reviewList.length === 0 ? (
            <p className="text-sm text-muted">Zatiaľ žiadne recenzie.</p>
          ) : (
            reviewList.map((r) => (
              <div key={r.id} className="border border-line rounded-xl p-3.5">
                <div className="flex items-start gap-3">
                  <Link href={`/movie/${r.movie.slug}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                    <div className="w-10 h-10 rounded-md bg-surface bg-cover bg-center flex-none" style={r.movie.poster ? { backgroundImage: `url('${r.movie.poster}')` } : undefined} />
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-sm group-hover:text-accent transition-colors truncate">{r.movie.title}</div>
                      <div className="text-xs text-muted mt-0.5">{new Date(r.createdAt).toLocaleDateString('sk-SK')}</div>
                    </div>
                  </Link>
                  {isOwn && (
                    <Link
                      href={`/movie/${r.movie.slug}/upravit/${r.id}`}
                      title="Upraviť recenziu"
                      aria-label="Upraviť recenziu"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted border border-line hover:text-accent hover:border-accent transition-colors flex-none"
                    >
                      <IconEdit className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
                {r.body && <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mt-3">{r.body}</p>}
              </div>
            ))
          )}
          {reviewsHasMore && (
            <button
              onClick={loadMoreReviews}
              disabled={loadingReviews}
              className="w-full text-sm font-semibold text-accent border border-line rounded-xl py-2.5 hover:border-accent disabled:opacity-50"
            >
              {loadingReviews ? 'Načítavam…' : 'Načítať ďalšie'}
            </button>
          )}
        </div>
      )}

      {active === 'blog' && (
        <div className="space-y-3">
          {isOwn && (
            <Link
              href="/blog/novy"
              className="inline-block bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-accent-dark mb-2"
            >
              + Napísať článok
            </Link>
          )}
          {blogPosts.length === 0 ? (
            <p className="text-sm text-muted">Zatiaľ žiadne články.</p>
          ) : (
            blogPosts.map((p) => (
              <Link key={p.id} href={`/blog/${p.id}`} className="flex gap-3 border border-line rounded-xl p-3.5 hover:border-accent">
                <div className="w-14 h-14 rounded-md bg-surface bg-cover bg-center flex-none" style={p.coverImage ? { backgroundImage: `url('${p.coverImage}')` } : undefined} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink truncate">{p.title}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {new Date(p.createdAt).toLocaleDateString('sk-SK')}
                    {p.isDraft && <span className="text-accent font-semibold"> · 📝 rozpísané</span>}
                    {p.published && <span className="text-emerald-600 font-semibold"> · publikované na hlavnej stránke</span>}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {active === 'seznamy' && <ProfileMovieLists lists={movieLists} isOwn={!!isOwn} />}

      {active === 'comments' && (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-muted">Zatiaľ žiadne komentáre.</p>
          ) : (
            comments.map((c) => (
              <Link
                key={c.id}
                href={c.review ? `/movie/${c.review.movie.slug}` : c.news ? `/news/${c.news.slug}` : `/movie/${c.movie!.slug}`}
                className="block border border-line rounded-xl p-3.5 hover:border-accent"
              >
                <div className="text-xs text-muted mb-1">
                  {c.review ? (
                    <>K filmu: <span className="text-ink font-semibold">{c.review.movie.title}</span></>
                  ) : c.news ? (
                    <>K novinke: <span className="text-ink font-semibold">{c.news.title}</span></>
                  ) : (
                    <>V diskusii k filmu: <span className="text-ink font-semibold">{c.movie!.title}</span></>
                  )}
                </div>
                <p className="text-sm text-ink line-clamp-2">{c.body}</p>
                <div className="text-[11px] text-muted mt-1.5">{new Date(c.createdAt).toLocaleDateString('sk-SK')}</div>
              </Link>
            ))
          )}
        </div>
      )}

      {active === 'fans' && (
        <div className="space-y-2">
          {fans.length === 0 ? (
            <p className="text-sm text-muted">Zatiaľ nemá žiadnych fanúšikov.</p>
          ) : (
            fans.map((f) => (
              <Link key={f.id} href={`/profile/${f.id}`} className="flex items-center gap-3 border border-line rounded-xl p-2.5 hover:border-accent">
                {f.avatar ? (
                  <img src={f.avatar} alt={f.name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center">
                    <IconUser className="w-4 h-4 text-muted" />
                  </div>
                )}
                <span className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  {displayUserName(f.name, t)}
                  {f.role === 'ADMIN' && <CriticBadge size="w-3.5 h-3.5" label={false} />}
                  
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
