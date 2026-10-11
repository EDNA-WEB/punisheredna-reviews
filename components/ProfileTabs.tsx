'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconUser, IconEdit } from './Icons';
import Pagination from './ClientPagination';
import CriticBadge from './CriticBadge';
import GoldStars from './profile/GoldStars';
import { useT } from './TranslationProvider';
import { displayUserName } from '@/lib/deletedUser';
import ProfileMovieLists from './ProfileMovieLists';

// Záložky nového profilu: jeden prepínač s počtami (bez „Další ▾“)
// a prehľad s plagátmi, kartami recenzií, zoznamami a blogom.

type ReviewT = {
  id: string;
  body?: string;
  createdAt: string;
  movie: { title: string; slug: string; poster: string | null; year?: string | null };
  rating?: number | null;
  likeCount?: number;
  commentCount?: number;
};
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
type ListT = { id: string; title: string; itemCount: number; items: { slug: string; title: string; poster: string | null; year: string | null }[] };

function daysSincePremiere(ratedAt: string, releaseDate: string | null): number | null {
  if (!releaseDate) return null;
  return Math.round((new Date(ratedAt).getTime() - new Date(releaseDate).getTime()) / 86_400_000);
}

function plain(md: string) {
  return md
    .replace(/\[\[youtube:[^\]]+\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const Arrow = () => (
  <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14m-5-5.5L19.5 12 14 17.5" />
  </svg>
);

export default function ProfileTabs({
  userId,
  reviews,
  comments,
  fans,
  latestRatings = [],
  bio,
  isOwn,
  blogPosts = [],
  movieLists = [],
  counts,
  sidebar
}: {
  userId: string;
  reviews: ReviewT[];
  comments: CommentT[];
  fans: Fan[];
  latestRatings?: RatingT[];
  bio?: string | null;
  isOwn?: boolean;
  blogPosts?: BlogPostT[];
  movieLists?: ListT[];
  counts: { ratings: number; reviews: number; blog: number; lists: number; comments: number; fans: number };
  sidebar?: ReactNode; // pravý stĺpec (vkus, aktivita, fanklub) — prepínač záložiek je nad oboma stĺpcami
}) {
  const t = useT();
  const router = useRouter();
  const nf = (n: number) => n.toLocaleString('cs-CZ');

  const tabs: { key: string; label: string; count?: number }[] = [
    { key: 'prehlad', label: t('profil.tab_prehled', 'Přehled') },
    { key: 'hodnotenie', label: t('profil.tab_hodnoceni', 'Hodnocení'), count: counts.ratings },
    { key: 'reviews', label: t('profil.tab_recenze', 'Recenze'), count: counts.reviews },
    { key: 'blog', label: t('profil.tab_blog', 'Blog'), count: counts.blog },
    { key: 'seznamy', label: t('profil.tab_seznamy', 'Seznamy'), count: counts.lists },
    { key: 'comments', label: t('profil.tab_komentare', 'Komentáře'), count: counts.comments },
    { key: 'fans', label: t('profil.tab_fanousci', 'Fanoušci'), count: counts.fans },
    { key: 'o_mne', label: t('profil.tab_o_mne', 'O mně') }
  ];

  const [active, setActive] = useState('prehlad');
  const [reviewList, setReviewList] = useState(reviews.slice(0, 10)); // API stránkuje po 10
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(Math.max(1, Math.ceil(counts.reviews / 10)));
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [ratingList, setRatingList] = useState(latestRatings.slice(0, 10));
  const [ratingsPage, setRatingsPage] = useState(1);
  const [ratingsTotalPages, setRatingsTotalPages] = useState(Math.max(1, Math.ceil(counts.ratings / 10)));
  const [loadingRatings, setLoadingRatings] = useState(false);

  async function goToReviewsPage(page: number) {
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/users/${userId}/reviews?page=${page}`);
      const data = await res.json();
      setReviewList(data.reviews);
      setReviewsTotalPages(data.totalPages);
      setReviewsPage(page);
    } finally {
      setLoadingReviews(false);
    }
  }

  async function goToRatingsPage(page: number) {
    setLoadingRatings(true);
    try {
      const res = await fetch(`/api/users/${userId}/ratings?page=${page}`);
      const data = await res.json();
      setRatingList(data.ratings);
      setRatingsTotalPages(data.totalPages);
      setRatingsPage(page);
    } finally {
      setLoadingRatings(false);
    }
  }

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
      if (!res.ok) throw new Error(data.error || 'Uložení se nezdařilo.');
      setEditingBio(false);
      router.refresh();
    } catch (err: any) {
      setBioError(err.message);
    } finally {
      setBioSaving(false);
    }
  }

  function go(key: string) {
    setActive(key);
    document.getElementById('profil-zalozky')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const sectionHead = (title: string, key?: string, count?: number) => (
    <div className="flex items-center gap-3 mb-3.5">
      <h2 className="font-display font-bold text-[20px] tracking-tight text-ink">{title}</h2>
      {key && count !== undefined && count > 0 && (
        <button type="button" onClick={() => go(key)} className="ml-auto inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink">
          {t('profil.vse', 'Vše')} {nf(count)} <Arrow />
        </button>
      )}
    </div>
  );

  const reviewCard = (r: ReviewT, full = false) => (
    <div key={r.id} className="ap-card p-4 sm:p-[18px] flex gap-4 sm:gap-[18px]">
      <Link href={`/movie/${r.movie.slug}`} className="flex-none">
        {r.movie.poster ? (
          <img src={r.movie.poster} alt={r.movie.title} className="pf-poster w-[70px] h-[105px] sm:w-[88px] sm:h-[132px]" loading="lazy" />
        ) : (
          <div className="pf-poster w-[70px] h-[105px] sm:w-[88px] sm:h-[132px] bg-surface2" />
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2.5">
          <Link href={`/movie/${r.movie.slug}`} className="font-display font-bold text-[17px] leading-snug text-ink hover:text-accent min-w-0">
            {r.movie.title} {r.movie.year && <span className="font-body font-medium text-[14px] text-muted">({r.movie.year})</span>}
          </Link>
          <div className="ml-auto flex items-center gap-2 flex-none">
            {typeof r.rating === 'number' && <GoldStars value={r.rating} size={14} />}
            {isOwn && (
              <Link
                href={`/movie/${r.movie.slug}/upravit/${r.id}`}
                title={t('profil.upravit_recenzi', 'Upravit recenzi')}
                aria-label={t('profil.upravit_recenzi', 'Upravit recenzi')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted border border-line hover:text-accent hover:border-accent"
              >
                <IconEdit className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
        {r.body &&
          (full ? (
            <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap mt-2">{r.body}</p>
          ) : (
            <p className="text-[14.5px] leading-relaxed text-ink mt-2 line-clamp-3">{plain(r.body)}</p>
          ))}
        <div className="flex items-center gap-4 mt-2.5 text-[13px] font-semibold text-muted">
          {typeof r.likeCount === 'number' && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 10v10H4V10Zm0 0 4.5-6.5a1.8 1.8 0 0 1 3.2 1.4L14 9h5a2 2 0 0 1 2 2.3l-1.2 6.6A2.5 2.5 0 0 1 17.3 20H7" />
              </svg>
              {r.likeCount}
            </span>
          )}
          {typeof r.commentCount === 'number' && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.5 12a8.5 8.5 0 0 1-12.6 7.45L3.5 20.5l1.05-4.3A8.5 8.5 0 1 1 20.5 12Z" />
              </svg>
              {r.commentCount}
            </span>
          )}
          <span className="ml-auto font-medium">{new Date(r.createdAt).toLocaleDateString('cs-CZ')}</span>
        </div>
      </div>
    </div>
  );

  const empty = (text: string) => <p className="text-[14px] text-muted py-2">{text}</p>;
  const overviewEmpty = latestRatings.length === 0 && reviews.length === 0 && movieLists.length === 0 && blogPosts.length === 0;

  return (
    <div id="profil-zalozky" className="scroll-mt-28">
      {/* prepínač záložiek */}
      <div className="pf-tabs-wrap ap-noscroll" role="tablist">
        <div className="pf-tabs">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              type="button"
              role="tab"
              aria-selected={active === tb.key}
              onClick={() => setActive(tb.key)}
              className={`pf-tab ${active === tb.key ? 'is-on' : ''}`}
            >
              {tb.label}
              {tb.count !== undefined && tb.count > 0 && <span className="pf-tab-count">{nf(tb.count)}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
      <div className="min-w-0">
      {active === 'prehlad' && (
        <div className="space-y-9">
          {overviewEmpty && empty(isOwn ? t('profil.prazdny_vlastni', 'Zatím tu nic není — ohodnoť první film nebo napiš recenzi.') : t('profil.prazdny', 'Zatím tu nic není.'))}

          {latestRatings.length > 0 && (
            <section>
              {sectionHead(t('profil.naposledy_hodnotil', 'Naposledy hodnotil'), 'hodnotenie', counts.ratings)}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-3.5">
                {latestRatings.slice(0, 6).map((r) => (
                  <Link key={r.id} href={`/movie/${r.movie.slug}`} className="group min-w-0">
                    <div className="relative">
                      {r.movie.poster ? (
                        <img src={r.movie.poster} alt={r.movie.title} className="pf-poster w-full aspect-[2/3]" loading="lazy" />
                      ) : (
                        <div className="pf-poster w-full aspect-[2/3] bg-surface2" />
                      )}
                      <span className="pf-poster-stars">
                        <GoldStars value={r.value} size={11} />
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold text-ink mt-2 truncate group-hover:text-accent">{r.movie.title}</div>
                    <div className="text-[12px] text-muted">{new Date(r.createdAt).toLocaleDateString('cs-CZ')}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {reviews.length > 0 && (
            <section>
              {sectionHead(t('profil.nejnovejsi_recenze', 'Nejnovější recenze'), 'reviews', counts.reviews)}
              <div className="space-y-3.5">{reviews.slice(0, 2).map((r) => reviewCard(r))}</div>
            </section>
          )}

          {movieLists.length > 0 && (
            <section>
              {sectionHead(t('profil.seznamy', 'Seznamy'), 'seznamy', counts.lists)}
              <div className="grid sm:grid-cols-2 gap-3.5">
                {movieLists.slice(0, 2).map((l) => (
                  <button key={l.id} type="button" onClick={() => go('seznamy')} className="ap-card p-4 flex gap-4 items-center text-left pf-hover">
                    <div className="relative w-[124px] h-[92px] flex-none">
                      {l.items.slice(0, 4).map((m, i) =>
                        m.poster ? (
                          <img key={m.slug} src={m.poster} alt="" className="pf-stack" style={{ left: i * 22, top: i * 2, zIndex: 4 - i }} loading="lazy" />
                        ) : (
                          <span key={m.slug} className="pf-stack bg-surface2" style={{ left: i * 22, top: i * 2, zIndex: 4 - i }} />
                        )
                      )}
                      {l.items.length === 0 && <span className="pf-stack bg-surface2" style={{ left: 0, top: 0 }} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-bold text-[16px] leading-snug text-ink line-clamp-2">{l.title}</div>
                      <div className="text-[13px] text-muted mt-1">
                        {t('profil.filmu', 'Filmů')}: {l.itemCount}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {blogPosts.length > 0 && (
            <section>
              {sectionHead(t('profil.z_blogu', 'Z blogu'), 'blog', counts.blog)}
              <div className="grid sm:grid-cols-2 gap-3.5">
                {blogPosts.slice(0, 2).map((p) => (
                  <Link key={p.id} href={`/blog/${p.id}`} className="ap-card overflow-hidden group">
                    {p.coverImage ? (
                      <img src={p.coverImage} alt="" className="w-full h-[150px] object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                    ) : (
                      <div className="w-full h-[150px] bg-surface2" />
                    )}
                    <div className="p-4">
                      <div className="ap-label !text-accent">{t('profil.clanek', 'Článek')}</div>
                      <div className="font-display font-bold text-[16px] leading-snug text-ink mt-1 line-clamp-2 group-hover:text-accent">{p.title}</div>
                      <div className="text-[12.5px] text-muted mt-1.5">{new Date(p.createdAt).toLocaleDateString('cs-CZ')}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {active === 'o_mne' && (
        <div className="ap-card p-5">
          {editingBio ? (
            <div>
              <textarea
                className="field-input-sm min-h-[140px] w-full"
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                maxLength={1000}
                placeholder={t('profil.napis_o_sobe_ph', 'Napiš pár vět o sobě…')}
                autoFocus
              />
              {bioError && <div className="text-danger text-xs mt-1.5">{bioError}</div>}
              <div className="flex items-center gap-2.5 mt-2.5">
                <button onClick={saveBio} disabled={bioSaving} className="ap-chip ap-chip-red disabled:opacity-50">
                  {bioSaving ? t('profil.ukladam', 'Ukládám…') : t('profil.ulozit', 'Uložit')}
                </button>
                <button
                  onClick={() => {
                    setEditingBio(false);
                    setBioText(bio || '');
                    setBioError('');
                  }}
                  className="text-[13px] font-semibold text-muted hover:text-ink"
                >
                  {t('profil.zrusit', 'Zrušit')}
                </button>
              </div>
            </div>
          ) : bio ? (
            <div className="flex items-start gap-3">
              <p className="text-[15.5px] text-ink leading-relaxed whitespace-pre-wrap flex-1">{bio}</p>
              {isOwn && (
                <button
                  onClick={() => setEditingBio(true)}
                  title={t('profil.upravit', 'Upravit')}
                  aria-label={t('profil.upravit', 'Upravit')}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted border border-line hover:text-accent hover:border-accent flex-none"
                >
                  <IconEdit className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[14px] text-muted">{isOwn ? t('profil.bio_prazdne_vlastni', 'Ještě jsi o sobě nic nenapsal(a).') : t('profil.bio_prazdne', 'Zatím o sobě nic nenapsal(a).')}</p>
              {isOwn && (
                <button onClick={() => setEditingBio(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline mt-2">
                  <IconEdit className="w-3.5 h-3.5" />
                  {t('profil.napsat_o_sobe', 'Napsat o sobě')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {active === 'hodnotenie' && (
        <div className="space-y-2.5">
          {ratingList.length === 0
            ? empty(t('profil.zadna_hodnoceni', 'Zatím žádná hodnocení.'))
            : ratingList.map((r) => {
                const days = daysSincePremiere(r.createdAt, r.movie.releaseDate);
                return (
                  <Link key={r.id} href={`/movie/${r.movie.slug}`} className="ap-card flex items-center gap-3.5 p-3 pf-hover">
                    {r.movie.poster ? (
                      <img src={r.movie.poster} alt="" className="pf-poster w-11 h-[66px] flex-none" loading="lazy" />
                    ) : (
                      <div className="pf-poster w-11 h-[66px] flex-none bg-surface2" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[14.5px] font-semibold text-ink truncate">
                        {r.movie.title} {r.movie.year && <span className="text-muted font-normal">{r.movie.year}</span>}
                      </div>
                      <div className="text-[12.5px] text-muted mt-0.5">
                        {new Date(r.createdAt).toLocaleDateString('cs-CZ')}
                        {days !== null && (
                          <>
                            {' · '}
                            {days === 0
                              ? t('profil.v_den_premiery', 'v den premiéry')
                              : days > 0
                                ? `${days}. ${t('profil.den_od_premiery', 'den od premiéry')}`
                                : `${Math.abs(days)} ${t('profil.dni_pred_premierou', 'dní před premiérou')}`}
                          </>
                        )}
                      </div>
                    </div>
                    <GoldStars value={r.value} size={15} />
                  </Link>
                );
              })}
          <Pagination currentPage={ratingsPage} totalPages={ratingsTotalPages} onPageChange={goToRatingsPage} loading={loadingRatings} />
        </div>
      )}

      {active === 'reviews' && (
        <div className="space-y-3.5">
          {reviewList.length === 0 ? empty(t('profil.zadne_recenze', 'Zatím žádné recenze.')) : reviewList.map((r) => reviewCard(r, true))}
          <Pagination currentPage={reviewsPage} totalPages={reviewsTotalPages} onPageChange={goToReviewsPage} loading={loadingReviews} />
        </div>
      )}

      {active === 'blog' && (
        <div className="space-y-3">
          {isOwn && (
            <Link href="/blog/novy" className="ap-chip ap-chip-red !px-4 !py-2 !text-[13.5px] mb-1">
              + {t('profil.napsat_clanek', 'Napsat článek')}
            </Link>
          )}
          {blogPosts.length === 0
            ? empty(t('profil.zadne_clanky', 'Zatím žádné články.'))
            : blogPosts.map((p) => (
                <Link key={p.id} href={`/blog/${p.id}`} className="ap-card flex gap-3.5 p-3 pf-hover">
                  {p.coverImage ? (
                    <img src={p.coverImage} alt="" className="w-16 h-16 rounded-xl object-cover flex-none" loading="lazy" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-surface2 flex-none" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-semibold text-ink line-clamp-2">{p.title}</div>
                    <div className="text-[12.5px] text-muted mt-1">
                      {new Date(p.createdAt).toLocaleDateString('cs-CZ')}
                      {p.isDraft && <span className="text-accent font-semibold"> · {t('profil.rozepsane', 'rozepsané')}</span>}
                      {p.published && <span className="text-emerald-600 font-semibold"> · {t('profil.na_hlavni', 'na hlavní stránce')}</span>}
                    </div>
                  </div>
                </Link>
              ))}
        </div>
      )}

      {active === 'seznamy' && <ProfileMovieLists lists={movieLists} isOwn={!!isOwn} />}

      {active === 'comments' && (
        <div className="space-y-2.5">
          {comments.length === 0
            ? empty(t('profil.zadne_komentare', 'Zatím žádné komentáře.'))
            : comments.map((c) => (
                <Link
                  key={c.id}
                  href={c.review ? `/movie/${c.review.movie.slug}` : c.news ? `/news/${c.news.slug}` : c.movie ? `/movie/${c.movie.slug}` : '#'}
                  className="ap-card block p-4 pf-hover"
                >
                  <div className="text-[12.5px] text-muted mb-1.5">
                    {c.review ? (
                      <>
                        {t('profil.k_filmu', 'K filmu')}: <span className="text-ink font-semibold">{c.review.movie.title}</span>
                      </>
                    ) : c.news ? (
                      <>
                        {t('profil.k_novince', 'K novince')}: <span className="text-ink font-semibold">{c.news.title}</span>
                      </>
                    ) : c.movie ? (
                      <>
                        {t('profil.v_diskuzi', 'V diskuzi k filmu')}: <span className="text-ink font-semibold">{c.movie.title}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="pf-bubble">
                    <p className="text-[14.5px] text-ink line-clamp-3">{c.body}</p>
                  </div>
                  <div className="text-[12px] text-muted mt-1.5">{new Date(c.createdAt).toLocaleDateString('cs-CZ')}</div>
                </Link>
              ))}
        </div>
      )}

      {active === 'fans' && (
        <div className="grid sm:grid-cols-2 gap-2.5">
          {fans.length === 0
            ? empty(t('profil.zadni_fanousci', 'Zatím nemá žádné fanoušky.'))
            : fans.map((f) => (
                <Link key={f.id} href={`/profile/${f.id}`} className="ap-card flex items-center gap-3 p-3 pf-hover">
                  {f.avatar ? (
                    <img src={f.avatar} alt={f.name} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center">
                      <IconUser className="w-4 h-4 text-muted" />
                    </div>
                  )}
                  <span className="text-[14px] font-semibold text-ink flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{displayUserName(f.name, t)}</span>
                    {f.role === 'ADMIN' && <CriticBadge size="w-3.5 h-3.5" label={false} />}
                  </span>
                </Link>
              ))}
        </div>
      )}
      </div>
      {sidebar && <aside className="min-w-0 lg:sticky lg:top-24">{sidebar}</aside>}
      </div>
    </div>
  );
}
