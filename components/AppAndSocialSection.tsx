import { IconFacebook, IconInstagram, IconTiktok, IconYoutube } from './Icons';

type Props = {
  appStoreUrl: string | null;
  googlePlayUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
};

export default function AppAndSocialSection({ appStoreUrl, googlePlayUrl, facebookUrl, instagramUrl, tiktokUrl, youtubeUrl }: Props) {
  const socials = [
    { url: facebookUrl, icon: IconFacebook, label: 'Facebook' },
    { url: instagramUrl, icon: IconInstagram, label: 'Instagram' },
    { url: tiktokUrl, icon: IconTiktok, label: 'TikTok' },
    { url: youtubeUrl, icon: IconYoutube, label: 'YouTube' }
  ];

  return (
    <div className="mt-8 grid sm:grid-cols-2 gap-4">
      <div className="border border-line rounded-xl p-4 bg-card">
        <h3 className="font-display font-bold text-sm text-ink mb-3">Mobilná aplikácia</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={appStoreUrl || '#'}
            target={appStoreUrl ? '_blank' : undefined}
            rel="noopener noreferrer"
            className={`inline-block ${appStoreUrl ? '' : 'opacity-60 cursor-default pointer-events-none'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/appstore-badge.png" alt="Stiahnuť v App Store" className="h-11 w-auto" />
          </a>
          <a
            href={googlePlayUrl || '#'}
            target={googlePlayUrl ? '_blank' : undefined}
            rel="noopener noreferrer"
            className={`inline-block ${googlePlayUrl ? '' : 'opacity-60 cursor-default pointer-events-none'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/googleplay-badge.png" alt="Získať na Google Play" className="h-11 w-auto" />
          </a>
        </div>
        {!appStoreUrl && !googlePlayUrl && (
          <p className="text-[11px] text-muted mt-2">Odkazy sa doplnia v Administrácia → Vzhľad.</p>
        )}
      </div>

      <div className="border border-line rounded-xl p-4 bg-card">
        <h3 className="font-display font-bold text-sm text-ink mb-3">Sociálne siete</h3>
        <div className="flex items-center gap-2.5">
          {socials.map(({ url, icon: Icon, label }) => (
            <a
              key={label}
              href={url || '#'}
              target={url ? '_blank' : undefined}
              rel="noopener noreferrer"
              title={label}
              aria-label={label}
              className={`w-10 h-10 rounded-full border border-line flex items-center justify-center transition-colors ${
                url ? 'text-muted hover:text-accent hover:border-accent' : 'text-line cursor-default pointer-events-none'
              }`}
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
        {socials.every((s) => !s.url) && (
          <p className="text-[11px] text-muted mt-2">Odkazy sa doplnia v Administrácia → Vzhľad.</p>
        )}
      </div>
    </div>
  );
}
