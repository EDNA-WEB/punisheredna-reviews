import { IconLink, IconFacebook, IconInstagram, IconTiktok, IconYoutube } from './Icons';

type User = {
  firstName: string | null;
  lastName: string | null;
  tagline: string | null;
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
  country: string | null;
  region: string | null;
};

export default function ProfileContactInfo({ user }: { user: User }) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  const links = [
    { url: user.homepage, label: 'Homepage', icon: IconLink },
    { url: user.facebookUrl, label: 'Facebook', icon: IconFacebook },
    { url: user.instagramUrl, label: 'Instagram', icon: IconInstagram },
    { url: user.tiktokUrl, label: 'TikTok', icon: IconTiktok },
    { url: user.youtubeUrl, label: 'YouTube', icon: IconYoutube },
    { url: user.xUrl, label: 'X', icon: IconLink },
    { url: user.spotifyUrl, label: 'Spotify', icon: IconLink },
    { url: user.linkedinUrl, label: 'LinkedIn', icon: IconLink },
    { url: user.snapchatUrl, label: 'Snapchat', icon: IconLink },
    { url: user.blueskyUrl, label: 'Bluesky', icon: IconLink }
  ].filter((l) => l.url);

  const hasAnything = fullName || user.tagline || (!user.hideEmail && user.email) || links.length > 0;
  if (!hasAnything) return null;

  return (
    <div className="border border-line rounded-xl bg-card p-4 mb-6 text-sm">
      {fullName && <div className="font-semibold text-ink mb-0.5">{fullName}</div>}
      {user.tagline && <div className="text-muted mb-2">{user.tagline}</div>}

      {!user.hideEmail && user.email && (
        <div className="text-muted text-xs mb-2">{user.email}</div>
      )}

      {links.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {links.map(({ url, label, icon: Icon }) => (
            <a
              key={label}
              href={url!}
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
