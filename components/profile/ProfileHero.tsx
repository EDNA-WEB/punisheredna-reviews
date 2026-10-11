import Link from 'next/link';
import ProfileActions from './ProfileActions';
import { ApUser } from '../article/ArticleIcons';

// Úvodná karta nového profilu (rovnaký štýl ako úvod článku).
export type ProfileHeroProps = {
  user: { id: string; name: string; avatar: string | null; bio: string | null; tagline: string | null };
  badges: { critic: boolean; editor: boolean; golden: boolean; banned: boolean };
  online: 'online' | 'recent' | 'offline';
  memberSince: string;
  place: string | null;
  goldenNote: string | null;
  backdrop: string | null;
  top3: { slug: string; title: string; poster: string | null }[];
  stats: { value: string; label: string; mobileHidden?: boolean }[];
  isOwn: boolean;
  canInteract: boolean;
  isFollowing: boolean;
  labels: Record<string, string>;
};

const ONLINE_COLOR = { online: '#22C55E', recent: '#F59E0B', offline: '#EF4444' } as const;

export default function ProfileHero(p: ProfileHeroProps) {
  const L = p.labels;
  const [first, second, third] = p.top3;
  return (
    <section className="ap-hero pf-hero -mx-5 sm:mx-0">
      {p.backdrop && <img src={p.backdrop} alt="" aria-hidden="true" className="ap-hero-bg" />}
      <div className="ap-hero-shade" />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] items-center px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10 pb-6">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-7 items-center sm:items-center text-center sm:text-left min-w-0">
          {/* avatar */}
          <div className="relative flex-none">
            <div className={`pf-avatar-ring ${p.badges.golden ? 'is-gold' : ''}`}>
              {p.user.avatar ? (
                <img src={p.user.avatar} alt={p.user.name} className="pf-avatar" />
              ) : (
                <span className="pf-avatar flex items-center justify-center bg-[#24262C] text-white/60">
                  <ApUser className="w-1/2 h-1/2" />
                </span>
              )}
            </div>
            <span className="pf-online" style={{ backgroundColor: ONLINE_COLOR[p.online] }} title={L[`online_${p.online}`]} aria-label={L[`online_${p.online}`]} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-3">
              {p.badges.critic && <span className="pf-badge pf-badge-blue">{L.overeny_kritik}</span>}
              {p.badges.editor && <span className="pf-badge pf-badge-blue">{L.redaktor}</span>}
              {p.badges.golden && <span className="pf-badge pf-badge-gold">GOLDEN TICKET</span>}
              {p.badges.banned && <span className="pf-badge pf-badge-red">{L.zablokovany}</span>}
              {p.online === 'online' && (
                <span className="ap-chip ap-glass text-white !text-[11.5px] !py-[5px] !px-2.5">
                  <span className="w-[7px] h-[7px] rounded-full bg-[#22C55E]" />
                  Online
                </span>
              )}
            </div>
            <h1 className="font-display font-extrabold text-white text-[30px] sm:text-[38px] lg:text-[42px] leading-[1.05] tracking-[-0.025em] break-words">{p.user.name}</h1>
            {p.user.tagline && <div className="text-[14.5px] text-white/75 mt-1.5">{p.user.tagline}</div>}
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 mt-2.5 text-[13.5px] text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
                  <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                  <path d="M3.5 9.5h17M8 3v4M16 3v4" />
                </svg>
                {p.memberSince}
              </span>
              {p.place && (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
                    <circle cx="12" cy="10" r="2.3" />
                  </svg>
                  {p.place}
                </span>
              )}
            </div>
            {p.goldenNote && <div className="text-[13px] font-semibold text-[#F5C542] mt-1.5">{p.goldenNote}</div>}
            {p.user.bio && <p className="text-[15px] leading-relaxed text-white/85 mt-3 max-w-[540px] line-clamp-3 mx-auto sm:mx-0">{p.user.bio}</p>}
            <div className="flex justify-center sm:justify-start">
              <ProfileActions userId={p.user.id} isOwn={p.isOwn} canInteract={p.canInteract} initialFollowing={p.isFollowing} />
            </div>
          </div>
        </div>

        {/* Top 3 filmy */}
        {first && (
          <div className="hidden lg:block">
            <div className="ap-label !text-white/60 text-center mb-3">{L.top3}</div>
            <div className="relative h-[232px]">
              {second && (
                <Link href={`/movie/${second.slug}`} className="pf-top pf-top-left" title={second.title}>
                  {second.poster ? <img src={second.poster} alt={second.title} /> : <span>{second.title}</span>}
                </Link>
              )}
              {third && (
                <Link href={`/movie/${third.slug}`} className="pf-top pf-top-right" title={third.title}>
                  {third.poster ? <img src={third.poster} alt={third.title} /> : <span>{third.title}</span>}
                </Link>
              )}
              <Link href={`/movie/${first.slug}`} className="pf-top pf-top-main" title={first.title}>
                {first.poster ? <img src={first.poster} alt={first.title} /> : <span>{first.title}</span>}
              </Link>
              <span className="pf-top-num">1</span>
            </div>
          </div>
        )}
      </div>

      {/* čísla */}
      <div className={`relative grid pf-stats ap-glass mx-4 sm:mx-6 mb-5 sm:mb-6 rounded-2xl grid-cols-4 sm:grid-cols-5`}>
        {p.stats.map((s, i) => (
          <div key={s.label} className={`pf-stat ${s.mobileHidden ? 'hidden sm:block' : ''} ${i ? 'pf-stat-sep' : ''}`}>
            <div className="font-display font-extrabold text-[20px] sm:text-[24px] tracking-tight text-white tabular-nums">{s.value}</div>
            <div className="text-[12px] sm:text-[12.5px] text-white/65 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
