'use client';

import AuthPageBackgroundOverride from '@/components/AuthPageBackgroundOverride';

// Spoločná karta pre stránky okolo e-mailu (overenie, obnovenie hesla,
// odhlásenie odberu) — rovnaký štýl ako prihlásenie a registrácia.
type Icon = 'mail' | 'ok' | 'warn' | 'lock';

function Glyph({ icon }: { icon: Icon }) {
  const tone =
    icon === 'ok' ? 'bg-emerald-500/15 text-emerald-400' : icon === 'warn' ? 'bg-amber-400/15 text-amber-300' : 'bg-accent/15 text-accent';
  return (
    <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${tone}`} aria-hidden="true">
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {icon === 'mail' && (
          <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3.5 6.5l8.5 6 8.5-6" />
          </>
        )}
        {icon === 'ok' && <path d="M5 12.5l4.5 4.5L19 7.5" />}
        {icon === 'warn' && (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v6M12 16.5v.5" />
          </>
        )}
        {icon === 'lock' && (
          <>
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </>
        )}
      </svg>
    </div>
  );
}

export default function AuthCard({ icon, title, children }: { icon?: Icon; title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <AuthPageBackgroundOverride />
      <div className="w-full max-w-md bg-black/55 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl p-8 text-center">
        {icon && <Glyph icon={icon} />}
        <h1 className={`font-display font-extrabold text-2xl text-white ${icon ? 'mt-5' : ''}`}>{title}</h1>
        <div className="mt-3 text-sm text-white/75 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
