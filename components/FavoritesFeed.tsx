import Link from 'next/link';
import StarRating from './StarRating';
import { IconUser } from './Icons';

// Zobrazenie "Aktivity obľúbených" na webe (dáta z lib/activityFeed.ts).
// Serverová komponenta — texty dostáva cez t() zo stránky (preklady).

type T = (key: string) => string;

// "(a)" a "mu/jej" podľa pohlavia autora — bez vyplneného pohlavia ostane neutrálny tvar.
function g(text: string, gender: string | null | undefined) {
  if (gender === 'MALE') return text.replace(/\(a\)/g, '').replace(/mu\/(jej|jí)/g, 'mu');
  if (gender === 'FEMALE') return text.replace(/\(a\)/g, 'a').replace(/mu\/jej/g, 'jej').replace(/mu\/jí/g, 'jí');
  return text;
}

function timeAgo(date: string | Date, t: T) {
  const d = new Date(date);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return t('feed.prave_teraz');
  if (diffMin < 60) return t('feed.pred_min').replace('{n}', String(diffMin));
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('feed.pred_h').replace('{n}', String(diffH));
  return d.toLocaleDateString('cs-CZ');
}

function movieHref(m: any) {
  if (m.seasonNumber && m.episodeNumber) return `/movie/${m.slug}/sezona/${m.seasonNumber}/epizoda/${m.episodeNumber}`;
  if (m.seasonNumber) return `/movie/${m.slug}/sezona/${m.seasonNumber}`;
  return `/movie/${m.slug}`;
}

function describe(item: any, t: T) {
  // Vráti [text akcie, cieľ {label, href}, druhotný cieľ?]
  switch (item.kind) {
    case 'review':
      return { action: t('feed.recenzoval'), target: { label: item.movie.displayTitle, href: movieHref(item.movie) } };
    case 'rating':
      return { action: t('feed.hodnotil'), target: { label: item.movie.displayTitle, href: movieHref(item.movie) } };
    case 'news_comment':
      return { action: item.isReply ? t('feed.odpoved_clanok') : t('feed.komentar_clanok'), target: { label: item.news.title, href: `/news/${item.news.slug}` } };
    case 'review_comment':
      return {
        action: t('feed.komentar_recenzia'),
        target: { label: item.reviewAuthor.name, href: `/profile/${item.reviewAuthor.id}` },
        extra: { prefix: t('feed.k_titulu'), label: item.movie.displayTitle, href: movieHref(item.movie) }
      };
    case 'movie_comment':
      return { action: t('feed.prispevok_film'), target: { label: item.movie.displayTitle, href: `${movieHref(item.movie)}` } };
    case 'news_like':
      return { action: t('feed.paci_clanok'), target: { label: item.news.title, href: `/news/${item.news.slug}` } };
    case 'review_like':
      return {
        action: t('feed.paci_recenzia'),
        target: { label: item.reviewAuthor.name, href: `/profile/${item.reviewAuthor.id}` },
        extra: { prefix: t('feed.k_titulu'), label: item.movie.displayTitle, href: movieHref(item.movie) }
      };
    case 'follow':
      return item.isViewer
        ? { action: t('feed.sleduje_teba'), target: null }
        : { action: t('feed.sleduje'), target: { label: item.targetUser.name, href: `/profile/${item.targetUser.id}` } };
    case 'person_follow':
      return { action: t('feed.oblubena_osoba'), target: { label: item.person.name, href: `/osobnost/${item.person.slug}` } };
    case 'watchlist':
      return { action: t('feed.chce_vidiet'), target: { label: item.movie.displayTitle, href: movieHref(item.movie) } };
    case 'favorite':
      return { action: t('feed.oblubene'), target: { label: item.movie.displayTitle, href: movieHref(item.movie) } };
    case 'thread_post':
      return { action: t('feed.prispevok_diskusia'), target: { label: item.thread.title, href: `/diskusie/${item.thread.id}` } };
    case 'thread':
      return { action: t('feed.nova_diskusia'), target: { label: item.thread.title, href: `/diskusie/${item.thread.id}` } };
    case 'news_post':
      return { action: t('feed.novy_clanok'), target: { label: item.news.title, href: `/news/${item.news.slug}` } };
    case 'avatar':
      return { action: t('feed.nova_fotka'), target: null };
    case 'profile_info':
      return { action: t('feed.profil'), target: { label: '', href: `/profile/${item.author.id}` } };
    default:
      return { action: '', target: null };
  }
}

export default function FavoritesFeed({ items, t }: { items: any[]; t: T }) {
  return (
    <div className="border border-line rounded-xl overflow-hidden divide-y divide-line bg-card">
      {items.map((item) => {
        const d: any = describe(item, t);
        const image = item.movie?.poster || item.news?.coverImage || item.person?.photo || (item.kind === 'avatar' ? item.author.avatar : null);
        const imageHref = d.extra?.href || d.target?.href || `/profile/${item.author.id}`;
        return (
          <div key={`${item.kind}-${item.id}`} className="flex gap-3 p-3.5">
            <Link href={`/profile/${item.author.id}`} className="flex-none">
              {item.author.avatar ? (
                <img src={item.author.avatar} alt={item.author.name} className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
                  <IconUser className="w-5 h-5 text-muted" />
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-ink leading-snug">
                <Link href={`/profile/${item.author.id}`} className="font-semibold hover:text-accent">
                  {item.author.name}
                </Link>{' '}
                <span className="text-muted">{g(d.action, item.author.gender)}</span>{' '}
                {d.target && d.target.label && (
                  <Link href={d.target.href} className="font-semibold text-accent hover:underline">
                    {d.target.label}
                  </Link>
                )}
                {d.extra && (
                  <>
                    {' '}
                    <span className="text-muted">{d.extra.prefix}</span>{' '}
                    <Link href={d.extra.href} className="font-semibold text-accent hover:underline">
                      {d.extra.label}
                    </Link>
                  </>
                )}
              </div>
              {(item.kind === 'rating' || (item.kind === 'review' && item.rating !== null)) && (
                <div className="mt-1">
                  <StarRating rating={item.rating} size="w-3.5 h-3.5" />
                </div>
              )}
              {(item.snippet || (item.kind === 'review' && item.body)) && (
                <p className="text-xs text-muted mt-1 line-clamp-2">{item.snippet || String(item.body).slice(0, 160)}</p>
              )}
              <div className="text-[11px] text-muted mt-1">{timeAgo(item.createdAt, t)}</div>
            </div>
            {image && (
              <Link href={imageHref} className="flex-none">
                <img
                  src={image}
                  alt=""
                  className={`${item.movie || item.person ? 'w-10 h-14' : 'w-16 h-10'} rounded-md object-cover bg-surface`}
                />
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
