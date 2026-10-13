import Link from 'next/link';
import type { ReactNode } from 'react';
import { PersonFollow, PersonShare } from './PersonActions';
import { IconInstagram, IconTwitterX, IconFacebook } from '../Icons';
import { ApUser } from '../article/ArticleIcons';

// Úvodná karta nového profilu osobnosti (herec / tvorca) — štýl ako profil používateľa.
export type PersonHeroProps = {
  slug: string;
  personId: string;
  name: string;
  photo: string | null;
  roleLabel: string;
  activeLabel: string | null;
  popularity: number | null;
  bornLine: string | null;
  diedLine: string | null;
  place: string | null;
  flag: { url: string; countryName: string } | null;
  bio: string | null;
  backdrop: string | null;
  knownFor: { slug: string; title: string; poster: string | null; percent: number | null }[];
  stats: { value: string; label: string; mobileHidden?: boolean }[];
  topTitle: { slug: string; title: string; poster: string | null; percent: number } | null;
  canFollow: boolean;
  isFollowing: boolean;
  timeline: ReactNode;
  socials: { instagramUrl?: string | null; twitterUrl?: string | null; facebookUrl?: string | null } | null;
  labels: Record<string, string>;
};

function scoreBg(p: number) {
  return p >= 70 ? '#059669' : p >= 20 ? '#2563EB' : '#15171A';
}

export function ScorePill({ percent, className = '' }: { percent: number | null; className?: string }) {
  if (percent === null) return null;
  return (
    <span className={`ps-score ${className}`} style={{ backgroundColor: scoreBg(percent) }}>
      {percent}%
    </span>
  );
}

export default function PersonHero(p: PersonHeroProps) {
  const L = p.labels;
  const [first, second, third] = p.knownFor;
  const socials = [
    { url: p.socials?.instagramUrl, label: 'Instagram', Icon: IconInstagram },
    { url: p.socials?.twitterUrl, label: 'X', Icon: IconTwitterX },
    { url: p.socials?.facebookUrl, label: 'Facebook', Icon: IconFacebook }
  ].filter((s) => s.url && /^https?:\/\//i.test(s.url));

  return (
    <section className="ap-hero -mx-5 sm:mx-0">
      {p.backdrop && <img src={p.backdrop} alt="" aria-hidden="true" className="ap-hero-bg" />}
      <div className="ap-hero-shade" />

      <div className="relative grid gap-7 lg:gap-8 md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)_280px] items-center px-5 sm:px-8 lg:px-10 pt-8 sm:pt-9 pb-6">
        {/* fotka */}
        <div className="relative w-[150px] sm:w-[200px] mx-auto md:mx-0">
          {p.photo ? (
            <img src={p.photo} alt={p.name} className="ps-photo" />
          ) : (
            <div className="ps-photo flex items-center justify-center bg-[#24262C] text-white/40">
              <ApUser className="w-1/2 h-1/2" />
            </div>
          )}
          {p.popularity !== null && (
            <span className="ap-chip ap-glass text-white absolute left-2.5 bottom-2.5 !text-[11.5px] !py-[5px] !px-2.5" title={L.popularita_info}>
              <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="#3DD68C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m3.5 16.5 5.5-5.5 4 4 7.5-7.5" />
                <path d="M15 7.5h5.5V13" />
              </svg>
              {L.popularita} {p.popularity.toFixed(0)}
            </span>
          )}
        </div>

        {/* text */}
        <div className="min-w-0 text-center md:text-left">
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
            <span className="pf-badge !bg-[var(--color-accent)] text-white uppercase">{p.roleLabel}</span>
            {p.activeLabel && <span className="ap-chip ap-glass text-white !text-[11.5px] !py-[5px] !px-2.5">{p.activeLabel}</span>}
          </div>
          <h1 className="font-display font-extrabold text-white text-[32px] sm:text-[40px] lg:text-[46px] leading-[1.04] tracking-[-0.025em] break-words">{p.name}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 mt-3 text-[13.5px] sm:text-[14px] text-white/75">
            {p.bornLine && (
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
                  <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                  <path d="M3.5 9.5h17M8 3v4M16 3v4" />
                </svg>
                {p.bornLine}
              </span>
            )}
            {p.place && (
              <span className="inline-flex items-center gap-1.5">
                {p.flag ? (
                  <img src={p.flag.url} alt={p.flag.countryName} className="h-3 w-auto rounded-[2px]" />
                ) : (
                  <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
                    <circle cx="12" cy="10" r="2.3" />
                  </svg>
                )}
                {p.place}
              </span>
            )}
          </div>
          {p.diedLine && <div className="text-[13.5px] text-white/65 mt-1">{p.diedLine}</div>}
          {p.bio && <p className="text-[15px] leading-relaxed text-white/85 mt-3 max-w-[560px] line-clamp-3 mx-auto md:mx-0">{p.bio}</p>}
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-2.5 mt-5">
            {p.canFollow ? (
              <PersonFollow personId={p.personId} initialFollowing={p.isFollowing} />
            ) : (
              <Link href="/login" className="ap-chip ap-chip-red !px-[18px] !py-2.5 !text-[14px]">
                {L.prihlas_se}
              </Link>
            )}
            {p.timeline}
            {socials.map(({ url, label, Icon }) => (
              <a key={label} href={url!} target="_blank" rel="noopener noreferrer nofollow" className="ap-chip ap-glass text-white !px-3 !py-2.5 hover:bg-white/20" title={label} aria-label={label}>
                <Icon className="w-4 h-4" />
              </a>
            ))}
            <PersonShare slug={p.slug} />
          </div>
        </div>

        {/* Známy z */}
        {first && (
          <div className="hidden lg:block">
            <div className="ap-label !text-white/60 text-center mb-3">{L.znamy_z}</div>
            <div className="relative h-[222px]">
              {second && (
                <Link href={`/movie/${second.slug}`} className="pf-top pf-top-left !w-[104px] !h-[156px]" title={second.title}>
                  {second.poster ? <img src={second.poster} alt={second.title} /> : <span>{second.title}</span>}
                </Link>
              )}
              {third && (
                <Link href={`/movie/${third.slug}`} className="pf-top pf-top-right !w-[104px] !h-[156px]" title={third.title}>
                  {third.poster ? <img src={third.poster} alt={third.title} /> : <span>{third.title}</span>}
                </Link>
              )}
              <Link href={`/movie/${first.slug}`} className="pf-top pf-top-main !w-[130px] !h-[195px]" title={first.title}>
                {first.poster ? <img src={first.poster} alt={first.title} /> : <span>{first.title}</span>}
              </Link>
              {first.percent !== null && (
                <span className="absolute left-1/2 top-[182px] -translate-x-1/2 z-[3]">
                  <ScorePill percent={first.percent} />
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* čísla */}
      <div className="relative grid ap-glass mx-4 sm:mx-6 mb-5 sm:mb-6 rounded-2xl grid-cols-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.4fr)]">
        {p.stats.map((s, i) => (
          <div key={s.label} className={`pf-stat ${s.mobileHidden ? 'hidden sm:block' : ''} ${i ? 'pf-stat-sep' : ''}`}>
            <div className="font-display font-extrabold text-[19px] sm:text-[24px] tracking-tight text-white tabular-nums">{s.value}</div>
            <div className="text-[11px] sm:text-[12.5px] text-white/65 mt-0.5 leading-tight">{s.label}</div>
          </div>
        ))}
        {p.topTitle && (
          <Link href={`/movie/${p.topTitle.slug}`} className="hidden lg:flex items-center gap-3 px-[18px] py-3 pf-stat-sep group min-w-0">
            {p.topTitle.poster ? <img src={p.topTitle.poster} alt="" className="w-[38px] h-[56px] rounded-[7px] object-cover flex-none" /> : null}
            <div className="min-w-0">
              <div className="text-[11.5px] text-white/60">{L.nejuspesnejsi}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-display font-bold text-[15px] text-white truncate group-hover:underline">{p.topTitle.title}</span>
                <ScorePill percent={p.topTitle.percent} />
              </div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
