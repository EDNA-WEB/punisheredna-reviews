import Link from 'next/link';
import type { ReactNode } from 'react';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import { addHeadingIds, splitForInsert } from '@/lib/articleHtml';
import Logo from '../Logo';
import WatchlistButton from '../WatchlistButton';
import FollowButton from '../FollowButton';
import CoverTrailer from './CoverTrailer';
import ArticleToc from './ArticleToc';
import { ArticleActionsProvider, ArticleLikeCard, ArticleRail, MobileActionBar, ReadingProgressBar } from './ArticleActions';
import { ApArrow, ApClock, ApThumb, ApUser } from './ArticleIcons';

// ---------------------------------------------------------------------------
// Nové zobrazenie článku (novinky aj blog). Rovnaký vzhľad pre prihlásených
// aj pre zdieľanú verziu (/sdilet/…) — tá má readOnly: žiadne odkazy, žiadne
// tlačidlá, nikam sa z nej nedá preklikať, len čítať.
// ---------------------------------------------------------------------------

export type ArticleCard = { key: string; title: string; href: string | null; image: string | null; label: string; minutes?: number };

export type ArticleMovieData = {
  title: string;
  href: string | null;
  poster: string | null;
  year: string | null;
  genres: string[];
  runtimeMinutes: number | null;
  isSeries: boolean;
  percent: number | null;
  ratingCount: number;
  facts: { label: string; value: string }[];
  cast: { name: string; href: string | null; photo: string | null }[];
  movieId: string | null;
  inWatchlist: boolean | null; // null = tlačidlo „Chci vidět“ sa nezobrazí
};

export type ReadOnlyCommentData = {
  id: string;
  body: string;
  createdAt: string;
  name: string;
  avatar: string | null;
  isAuthor: boolean;
  likeCount: number;
  replies: ReadOnlyCommentData[];
};

export type ArticleViewProps = {
  readOnly: boolean;
  kicker: string;
  breadcrumb: { label: string; href: string | null }[];
  chips: string[];
  title: string;
  perex: string | null;
  minutes: number;
  date: string;
  author: {
    name: string;
    avatar: string | null;
    href: string | null;
    isCritic: boolean;
    stats: string | null;
    bio: string | null;
    follow: { targetId: string; initialFollowing: boolean } | null;
  };
  cover: string | null;
  trailerYoutubeId: string | null;
  html: string;
  movie: ArticleMovieData | null;
  tags: { label: string; href: string | null }[];
  likes: { myValue: number; likeCount: number; dislikeCount: number } | null;
  canReact: boolean;
  likeTarget: { newsId?: string } | null;
  commentCount: number | null;
  comments?: ReactNode;
  readOnlyComments?: ReadOnlyCommentData[];
  mostRead: ArticleCard[];
  mostReadTitle: string;
  related: ArticleCard[];
  sharePath: string | null;
  notice?: ReactNode;
  adminBar?: ReactNode;
  footer?: ReactNode;
};

// Odkaz len mimo zdieľanej verzie — inak obyčajný <div>/<span>.
function Maybe({ href, readOnly, className, children }: { href: string | null; readOnly: boolean; className?: string; children: ReactNode }) {
  if (href && !readOnly) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
}

function Avatar({ src, name, className }: { src: string | null; name: string; className: string }) {
  if (src) return <img src={src} alt={name} className={`${className} object-cover`} />;
  return (
    <span className={`${className} flex items-center justify-center bg-surface2 text-muted`}>
      <ApUser className="w-1/2 h-1/2" />
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function formatRuntime(min: number | null) {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

function scoreStroke(p: number) {
  if (p >= 70) return '#3DD68C';
  if (p >= 20) return '#4C8DFF';
  return '#9CA3AF';
}

function ScoreRing({ percent, size = 76 }: { percent: number; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${percent} %`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={scoreStroke(percent)}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * percent) / 100}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dy="0.35em" textAnchor="middle" fill="#fff" fontWeight="800" fontSize={size * 0.24} style={{ fontFamily: 'var(--font-display)' }}>
        {percent}%
      </text>
    </svg>
  );
}

function ReadOnlyComment({ c, authorLabel, depth = 0 }: { c: ReadOnlyCommentData; authorLabel: string; depth?: number }) {
  const date = new Date(c.createdAt).toLocaleDateString('cs-CZ');
  return (
    <div className={`flex gap-3 ${depth ? 'mt-3' : 'mb-5'}`}>
      <Avatar src={c.avatar} name={c.name} className={`${depth ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex-none`} />
      <div className="flex-1 min-w-0">
        <div className={`ap-bubble ${c.isAuthor ? 'is-author' : ''}`}>
          <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
            <span className="truncate">{c.name}</span>
            {c.isAuthor && <span className="ap-badge ap-badge-author">{authorLabel}</span>}
            <span className="ml-auto text-[12.5px] font-normal text-muted flex-none">{date}</span>
          </div>
          <p className="text-[15px] leading-[1.55] text-ink mt-1 whitespace-pre-wrap break-words">{c.body}</p>
        </div>
        {c.likeCount > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 ml-1.5 text-[12.5px] font-semibold text-muted">
            <ApThumb className="w-[15px] h-[15px]" />
            {c.likeCount}
          </div>
        )}
        {c.replies.map((r) => (
          <ReadOnlyComment key={r.id} c={r} authorLabel={authorLabel} depth={depth + 1} />
        ))}
      </div>
    </div>
  );
}

// Statická hlavička zdieľanej verzie: logo a názvy sekcií — nič z toho nie je odkaz.
function StaticHeader({ t }: { t: (k: string, f: string) => string }) {
  const items: [string, string][] = [
    ['nav.novinky', 'Novinky'],
    ['nav.kino', 'Kino'],
    ['nav.vod', 'VOD'],
    ['nav.filmy', 'Filmy'],
    ['nav.serialy', 'Seriály'],
    ['nav.rebricky', 'Žebříčky'],
    ['nav.zanre', 'Žánry'],
    ['nav.box_office', 'Box Office'],
    ['nav.pouzivatelia', 'Uživatelé'],
    ['nav.diskusie', 'Diskuze']
  ];
  return (
    <header className="bg-card border-b border-line select-none" aria-hidden="true">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <div className="h-[60px] flex items-center">
          <Logo className="h-8 w-auto" />
        </div>
        <div className="flex gap-6 h-11 items-center overflow-hidden whitespace-nowrap text-[14px] font-semibold text-muted">
          {items.map(([k, f], i) => (
            <span key={k} className={i === 0 ? 'text-ink ap-nav-on' : ''}>
              {t(k, f)}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}

export default async function ArticleView(p: ArticleViewProps) {
  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;
  const ro = p.readOnly;

  const { html: withIds, toc } = addHeadingIds(p.html);
  // Text → [1. odsek] fakty [2.–3. odsek] karta filmu [zvyšok]
  const [partA, restA] = p.movie ? splitForInsert(withIds, 1) : [withIds, ''];
  const [partB, partC] = p.movie && restA ? splitForInsert(restA, 2) : [restA, ''];

  const dateLabel = new Date(p.date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
  const movie = p.movie;
  const facts = movie && movie.facts.length >= 2 ? movie.facts.slice(0, 4) : [];
  const movieMeta = movie ? [movie.year, movie.genres.slice(0, 2).join(', '), formatRuntime(movie.runtimeMinutes)].filter(Boolean).join(' · ') : '';
  const hasComments = p.commentCount !== null;

  const factsStrip = facts.length > 0 && (
    <div className={`ap-facts ap-facts-${facts.length}`}>
      {facts.map((f) => (
        <div key={f.label} className="ap-fact">
          <div className="ap-label">{f.label}</div>
          <div className="font-display font-bold text-[15.5px] text-ink mt-1.5 leading-snug">{f.value}</div>
        </div>
      ))}
    </div>
  );

  const filmCard = movie && (
    <div className="ap-film">
      {movie.poster && <img src={movie.poster} alt="" aria-hidden="true" className="ap-film-bg" />}
      <div className="ap-film-shade" />
      <div className="relative flex gap-4 sm:gap-5 p-4 sm:p-5 items-center">
        <Maybe href={movie.href} readOnly={ro} className="flex-none">
          {movie.poster ? (
            <img src={movie.poster} alt={movie.title} className="w-[84px] h-[124px] sm:w-[96px] sm:h-[142px] object-cover rounded-[10px] shadow-[0_10px_24px_rgba(0,0,0,.5)]" />
          ) : (
            <div className="w-[84px] h-[124px] sm:w-[96px] sm:h-[142px] rounded-[10px] bg-white/10" />
          )}
        </Maybe>
        <div className="flex-1 min-w-0">
          <div className="ap-label !text-white/60">{movie.isSeries ? t('clanok.serial_v_clanku', 'Seriál v článku') : t('clanok.film_v_clanku', 'Film v článku')}</div>
          <Maybe href={movie.href} readOnly={ro} className="block font-display font-extrabold text-[21px] sm:text-[24px] leading-tight tracking-tight text-white mt-1 hover:underline">
            {movie.title}
          </Maybe>
          {movieMeta && <div className="text-[13.5px] text-white/70 mt-1">{movieMeta}</div>}
          {!ro && (
            <div className="flex flex-wrap gap-2 mt-3.5 ap-film-actions">
              {movie.href && (
                <Link href={movie.href} className="ap-chip ap-chip-red">
                  {t('clanok.detail_filmu', 'Detail filmu')}
                  <ApArrow className="w-4 h-4" />
                </Link>
              )}
              {movie.movieId && movie.inWatchlist !== null && <WatchlistButton movieId={movie.movieId} initialInWatchlist={movie.inWatchlist} />}
            </div>
          )}
        </div>
        {movie.percent !== null && (
          <div className="hidden sm:block text-center px-2 flex-none">
            <ScoreRing percent={movie.percent} />
            {movie.ratingCount > 0 && (
              <div className="text-[12px] text-white/65 mt-1">
                {movie.ratingCount} {t('clanok.hodnoceni', 'hodnocení')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const castStrip = movie && movie.cast.length > 0 && (
    <div className="mb-8">
      <div className="ap-label mb-3">{t('clanok.obsazeni', 'Obsazení')}</div>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 -mx-1 px-1 ap-noscroll">
        {movie.cast.slice(0, 6).map((a, i) => (
          <Maybe key={`${i}-${a.name}`} href={a.href} readOnly={ro} className="w-[84px] flex-none text-center group">
            {a.photo ? (
              <img src={a.photo} alt={a.name} className="ap-cast-photo" />
            ) : (
              <span className="ap-cast-photo flex items-center justify-center bg-surface2 font-display font-bold text-muted">{initials(a.name)}</span>
            )}
            <div className="text-[12.5px] font-semibold text-ink mt-2 leading-tight line-clamp-2 group-hover:text-accent">{a.name}</div>
          </Maybe>
        ))}
      </div>
    </div>
  );

  const body = (
    <div id="ap-text">
      <div className="article-body ap-body ap-lead" dangerouslySetInnerHTML={{ __html: partA }} />
      {factsStrip}
      {partB && <div className="article-body ap-body" dangerouslySetInnerHTML={{ __html: partB }} />}
      {filmCard}
      {castStrip}
      {partC && <div className="article-body ap-body" dangerouslySetInnerHTML={{ __html: partC }} />}
    </div>
  );

  const content = (
    <ArticleActionsProvider
      readOnly={ro}
      likes={p.likes}
      canReact={p.canReact}
      likeTarget={p.likeTarget}
      commentCount={p.commentCount}
      sharePath={p.sharePath}
      title={p.title}
    >
      <ReadingProgressBar />
      <div className={`pt-4 sm:pt-6 ${ro ? 'pb-10' : 'pb-24 lg:pb-6'}`}>
        {/* ---------- Úvodná karta ---------- */}
        <section className="ap-hero -mx-5 sm:mx-0">
          {p.cover && <img src={p.cover} alt="" aria-hidden="true" className="ap-hero-bg" />}
          <div className="ap-hero-shade" />
          <div className="relative grid gap-7 lg:gap-11 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] items-center px-5 sm:px-8 lg:px-10 pt-6 pb-8 sm:pt-9 sm:pb-11">
            <div className="min-w-0 order-2 lg:order-1">
              <nav className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-white/60 mb-4" aria-label="breadcrumb">
                {p.breadcrumb.map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span aria-hidden="true">/</span>}
                    {b.href && !ro ? (
                      <Link href={b.href} className="hover:text-white">
                        {b.label}
                      </Link>
                    ) : (
                      <span className={i === p.breadcrumb.length - 1 ? 'text-white' : ''}>{b.label}</span>
                    )}
                  </span>
                ))}
              </nav>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="ap-chip ap-chip-red uppercase tracking-wide">{p.kicker}</span>
                {p.chips.map((c) => (
                  <span key={c} className="ap-chip ap-glass text-white">
                    {c}
                  </span>
                ))}
                <span className="ap-chip ap-glass text-white">
                  <ApClock className="w-3.5 h-3.5" />
                  {p.minutes} {t('clanok.min_cteni', 'min čtení')}
                </span>
              </div>
              <h1 className="font-display font-extrabold text-white text-[28px] leading-[1.12] sm:text-[38px] lg:text-[40px] xl:text-[44px] lg:leading-[1.08] tracking-[-0.025em] mb-4 break-words">
                {p.title}
              </h1>
              {p.perex && <p className="text-[17px] sm:text-[19px] leading-relaxed text-white/80 mb-6 max-w-[560px]">{p.perex}</p>}
              <div className="flex items-center gap-3">
                <Maybe href={p.author.href} readOnly={ro} className="flex-none">
                  <Avatar src={p.author.avatar} name={p.author.name} className="w-11 h-11 rounded-full ring-2 ring-white/70" />
                </Maybe>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-bold text-[15px] text-white">
                    <Maybe href={p.author.href} readOnly={ro} className="truncate hover:underline">
                      {p.author.name}
                    </Maybe>
                    {p.author.isCritic && <span className="ap-critic">{t('clanok.kritik', 'KRITIK')}</span>}
                  </div>
                  <div className="text-[13px] text-white/65 mt-0.5">{dateLabel}</div>
                </div>
              </div>
            </div>
            {(p.cover || p.trailerYoutubeId) && (
              <div className="order-1 lg:order-2 min-w-0">
                {ro ? (
                  <div className="ap-cover">
                    {p.cover && <img src={p.cover} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />}
                  </div>
                ) : (
                  <CoverTrailer cover={p.cover} alt={p.title} youtubeId={p.trailerYoutubeId} />
                )}
              </div>
            )}
          </div>
        </section>

        {/* ---------- Lišta | text | pravý stĺpec ---------- */}
        <div className="grid gap-8 mt-8 sm:mt-10 lg:grid-cols-[52px_minmax(0,1fr)_280px] xl:grid-cols-[56px_minmax(0,1fr)_300px] xl:gap-10 items-start">
          <aside className="hidden lg:block sticky top-28 pt-1.5">
            <ArticleRail />
          </aside>

          <article id="ap-content" className="min-w-0 max-w-[700px] w-full scroll-mt-28">
            {p.notice}
            {p.adminBar}
            {body}

            {p.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 mb-8">
                {p.tags.map((tag, ti) =>
                  tag.href && !ro ? (
                    <Link key={`${ti}-${tag.label}`} href={tag.href} className="ap-tag">
                      <span className="text-accent">#</span>
                      {tag.label}
                    </Link>
                  ) : (
                    <span key={`${ti}-${tag.label}`} className="ap-tag">
                      <span className="text-accent">#</span>
                      {tag.label}
                    </span>
                  )
                )}
              </div>
            )}

            <ArticleLikeCard />

            {/* Autor */}
            <div className="ap-author">
              <Maybe href={p.author.href} readOnly={ro} className="flex-none">
                <Avatar src={p.author.avatar} name={p.author.name} className="w-16 h-16 rounded-full ring-[3px] ring-card" />
              </Maybe>
              <div className="flex-1 min-w-0">
                <div className="ap-label">{t('clanok.autor_clanku', 'Autor článku')}</div>
                <Maybe href={p.author.href} readOnly={ro} className="block font-display font-bold text-[18px] text-ink mt-0.5 hover:text-accent">
                  {p.author.name}
                </Maybe>
                {(p.author.isCritic || p.author.stats) && (
                  <div className="text-[14px] text-muted mt-0.5">
                    {[p.author.isCritic ? t('clanok.overeny_kritik', 'Ověřený kritik') : null, p.author.stats].filter(Boolean).join(' · ')}
                  </div>
                )}
                {p.author.bio && <p className="text-[14px] text-muted mt-1.5 line-clamp-2">{p.author.bio}</p>}
              </div>
              {!ro && p.author.follow && (
                <div className="flex-none w-full sm:w-auto">
                  <FollowButton targetId={p.author.follow.targetId} initialFollowing={p.author.follow.initialFollowing} />
                </div>
              )}
            </div>

            {/* Diskusia */}
            {hasComments && !ro && p.comments}
            {hasComments && ro && (
              <section id="diskuze" className="scroll-mt-28">
                <h2 className="font-display font-bold text-[24px] tracking-tight text-ink mb-2">
                  {t('clanok.diskuze', 'Diskuze')} <span className="text-muted font-semibold">{p.commentCount}</span>
                </h2>
                <p className="text-[13.5px] text-muted mb-5">{t('clanok.jen_prihlaseni', 'Komentovat a hodnotit mohou jen přihlášení čtenáři KrálFilmu.cz.')}</p>
                {(p.readOnlyComments || []).length === 0 ? (
                  <p className="text-muted text-sm">{t('clanok.zatim_bez_komentaru', 'Zatím žádné komentáře.')}</p>
                ) : (
                  (p.readOnlyComments || []).map((c) => <ReadOnlyComment key={c.id} c={c} authorLabel={t('clanok.badge_autor', 'AUTOR')} />)
                )}
              </section>
            )}
          </article>

          <aside className="min-w-0 lg:sticky lg:top-28">
            <div className="hidden lg:block">
              <ArticleToc items={toc} readOnly={ro} hasComments={hasComments} />
            </div>
            {p.mostRead.length > 0 && (
              <div>
                <div className="ap-label mb-3">{p.mostReadTitle}</div>
                <ol className="space-y-3.5">
                  {p.mostRead.slice(0, 4).map((m, i) => (
                    <li key={m.key}>
                      <Maybe href={m.href} readOnly={ro} className="flex gap-3 items-center group">
                        <div className="relative flex-none">
                          {m.image ? (
                            <img src={m.image} alt="" className="w-[74px] h-[74px] object-cover rounded-xl bg-surface" loading="lazy" />
                          ) : (
                            <div className="w-[74px] h-[74px] rounded-xl bg-surface" />
                          )}
                          <span className="ap-rank">{i + 1}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="ap-label !text-accent">{m.label}</div>
                          <div className="text-[14px] font-semibold leading-snug text-ink mt-1 line-clamp-3 group-hover:text-accent">{m.title}</div>
                        </div>
                      </Maybe>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </aside>
        </div>

        {/* ---------- Mohlo by vás zajímat ---------- */}
        {p.related.length > 0 && (
          <section className="ap-related -mx-5 sm:mx-0 mt-12">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-1 h-6 rounded bg-accent" aria-hidden="true" />
              <h2 className="font-display font-bold text-[22px] sm:text-[24px] tracking-tight text-white">{t('clanok.mohlo_by_vas_zajimat', 'Mohlo by vás zajímat')}</h2>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              {p.related.slice(0, 4).map((r) => (
                <Maybe key={r.key} href={r.href} readOnly={ro} className="ap-related-card group">
                  {r.image ? (
                    <img src={r.image} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 bg-white/5" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute left-4 right-4 bottom-4">
                    <span className="ap-chip ap-chip-red !py-1 !px-2.5 !text-[11px]">{r.label}</span>
                    <div className="font-display font-bold text-[16.5px] leading-snug text-white mt-2.5 line-clamp-3">{r.title}</div>
                    {r.minutes ? (
                      <div className="text-[12.5px] text-white/65 mt-1.5">
                        {r.minutes} {t('clanok.min_cteni', 'min čtení')}
                      </div>
                    ) : null}
                  </div>
                </Maybe>
              ))}
            </div>
          </section>
        )}

        {p.footer}
      </div>
      <MobileActionBar />
    </ArticleActionsProvider>
  );

  if (!ro) return content;

  return (
    <main className={`min-h-screen bg-bg ap-readonly`}>
      <StaticHeader t={t} />
      <div className="max-w-6xl mx-auto px-5 sm:px-6">{content}</div>
    </main>
  );
}
