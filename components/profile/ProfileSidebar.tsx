import Link from 'next/link';
import type { Taste, Activity } from '@/lib/profileData';
import GoldStars from './GoldStars';
import { ApUser } from '../article/ArticleIcons';
import { IconLink, IconFacebook, IconInstagram, IconTiktok, IconYoutube } from '../Icons';

// Pravý stĺpec nového profilu: filmový vkus, aktivita, fanklub, kontakt.

type Fan = { id: string; name: string; avatar: string | null };
type Contact = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  hideEmail: boolean;
  homepage: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  xUrl: string | null;
  youtubeUrl: string | null;
  spotifyUrl: string | null;
  linkedinUrl: string | null;
  snapchatUrl: string | null;
  blueskyUrl: string | null;
};

function hostOf(url: string) {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '')).slice(0, 40);
  } catch {
    return url.slice(0, 40);
  }
}

export default function ProfileSidebar({
  taste,
  activity,
  fans,
  fanCount,
  mutual,
  contact,
  deletedLabel,
  L
}: {
  taste: Taste;
  activity: Activity;
  fans: Fan[];
  fanCount: number;
  mutual: { names: string[]; total: number } | null;
  contact: Contact;
  deletedLabel: string;
  L: Record<string, string>;
}) {
  const name = (n: string) => (n.startsWith('Zmazaný používateľ ') ? deletedLabel : n);
  const links = [
    { url: contact.homepage, label: 'Web', icon: IconLink },
    { url: contact.instagramUrl, label: 'Instagram', icon: IconInstagram },
    { url: contact.facebookUrl, label: 'Facebook', icon: IconFacebook },
    { url: contact.tiktokUrl, label: 'TikTok', icon: IconTiktok },
    { url: contact.youtubeUrl, label: 'YouTube', icon: IconYoutube },
    { url: contact.xUrl, label: 'X', icon: IconLink },
    { url: contact.spotifyUrl, label: 'Spotify', icon: IconLink },
    { url: contact.linkedinUrl, label: 'LinkedIn', icon: IconLink },
    { url: contact.snapchatUrl, label: 'Snapchat', icon: IconLink },
    { url: contact.blueskyUrl, label: 'Bluesky', icon: IconLink }
  ].filter((l) => l.url && /^https?:\/\//i.test(l.url));
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
  const email = !contact.hideEmail && contact.email ? contact.email : null;
  const activeDays = activity.weeks.flat().some((d) => d.count > 0);

  return (
    <div className="space-y-5">
      {/* Filmový vkus */}
      {taste.total > 0 && (
        <div className="ap-card p-5">
          <div className="ap-label mb-3.5">{L.filmovy_vkus}</div>
          <div className="flex items-center gap-3.5 mb-4">
            <div className="font-display font-extrabold text-[40px] leading-none tracking-tight text-ink tabular-nums">
              {taste.average !== null ? taste.average.toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–'}
            </div>
            <div>
              <GoldStars value={taste.average || 0} size={15} />
              <div className="text-[12.5px] text-muted mt-1">{L.prumerne_hodnoceni}</div>
            </div>
          </div>
          <div className="space-y-[5px] mb-5">
            {taste.histogram.map((h) => (
              <div key={h.stars} className="flex items-center gap-2 text-[12px] font-semibold text-muted">
                <span className="w-2.5 text-right tabular-nums">{h.stars}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" fill="#F5B90B" />
                </svg>
                <div className="flex-1 h-[7px] rounded-full bg-surface2 overflow-hidden">
                  <div className="h-full rounded-full bg-[#F5B90B]" style={{ width: `${h.percent}%` }} />
                </div>
                <span className="w-8 text-right tabular-nums">{h.percent}%</span>
              </div>
            ))}
          </div>
          {taste.genres.length > 0 && (
            <>
              <div className="ap-label mb-2.5">{L.oblibene_zanry}</div>
              <div className="space-y-2.5">
                {taste.genres.map((g, i) => (
                  <div key={g.genre}>
                    <div className="flex text-[13.5px] font-semibold text-ink">
                      <span className="truncate">{g.genre}</span>
                      <span className="ml-auto text-muted tabular-nums">{g.percent}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface2 mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full pf-genre-bar" style={{ width: `${Math.max(4, (g.percent / Math.max(1, taste.genres[0].percent)) * 100)}%`, opacity: 1 - i * 0.12 }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Aktivita */}
      <div className="ap-card p-5">
        <div className="flex items-center mb-3">
          <div className="ap-label">{L.aktivita}</div>
          <span className="ml-auto text-[12px] text-muted">{L.posledni_4_mesice}</span>
        </div>
        <div className="pf-heat" role="img" aria-label={`${L.aktivita}: ${activity.ratings} ${L.hodnoceni_mn}, ${activity.reviews} ${L.recenzi_mn}`}>
          {activity.weeks.map((w, wi) => (
            <div key={wi} className="pf-heat-col">
              {w.map((d) => (
                <span key={d.date} className={`pf-heat-cell lv${d.future ? 'x' : d.level}`} title={d.future ? undefined : `${new Date(d.date + 'T12:00:00Z').toLocaleDateString('cs-CZ')}: ${d.count}`} />
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[12.5px] text-muted">
          <span>
            <b className="text-ink">{activity.ratings}</b> {L.hodnoceni_mn} · <b className="text-ink">{activity.reviews}</b> {L.recenzi_mn}
          </span>
          {activity.streak >= 2 && (
            <span className="font-semibold text-accent">
              {L.serie}: {activity.streak} {L.dni}
            </span>
          )}
          {!activeDays && <span>{L.zadna_aktivita}</span>}
        </div>
      </div>

      {/* Fanklub */}
      <div className="ap-card p-5">
        <div className="flex items-center mb-3.5">
          <div className="ap-label">{L.fanklub}</div>
          <span className="ml-auto text-[13px] font-bold text-ink">
            {fanCount} {L.fanousku}
          </span>
        </div>
        {fans.length === 0 ? (
          <p className="text-[13.5px] text-muted">{L.zadni_fanousci}</p>
        ) : (
          <div className="grid grid-cols-5 gap-2.5">
            {fans.slice(0, fanCount > 10 ? 9 : 10).map((f) => (
              <Link key={f.id} href={`/profile/${f.id}`} title={name(f.name)} className="block">
                {f.avatar ? (
                  <img src={f.avatar} alt={name(f.name)} className="pf-fan" loading="lazy" />
                ) : (
                  <span className="pf-fan flex items-center justify-center bg-surface2 text-muted">
                    <ApUser className="w-1/2 h-1/2" />
                  </span>
                )}
              </Link>
            ))}
            {fanCount > 10 && <span className="pf-fan flex items-center justify-center bg-surface text-[12.5px] font-bold text-muted">+{fanCount - 9}</span>}
          </div>
        )}
        {mutual && mutual.total > 0 && (
          <div className="mt-4 pt-3.5 border-t border-line text-[13px] text-muted leading-snug">
            {L.sledujete_take} <b className="text-ink">{mutual.names.slice(0, 2).join(', ')}</b>
            {mutual.total > 2 ? ` ${L.a_dalsi} ${mutual.total - 2}` : ''}
          </div>
        )}
      </div>

      {/* Kontakt */}
      {(fullName || email || links.length > 0) && (
        <div className="rounded-2xl bg-surface p-5">
          <div className="ap-label mb-2.5">{L.kontakt}</div>
          {fullName && <div className="text-[14px] font-semibold text-ink mb-1">{fullName}</div>}
          {email && <div className="text-[13px] text-muted mb-2 break-all">{email}</div>}
          <div className="flex flex-col gap-2">
            {links.map(({ url, label, icon: Icon }) => (
              <a key={label} href={url!} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2.5 text-[14px] font-medium text-ink hover:text-accent min-w-0">
                <Icon className="w-4 h-4 flex-none" />
                <span className="truncate">{hostOf(url!)}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
