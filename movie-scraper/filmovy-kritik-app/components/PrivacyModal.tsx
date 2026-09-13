'use client';

import { useState, useEffect } from 'react';
import { PrivacyCategory } from '@/lib/privacyDefaults';
import { useT } from './TranslationProvider';
import Logo from './Logo';

export default function PrivacyModal({ text, categories, trigger }: { text: string; categories: PrivacyCategory[]; trigger: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    categories.forEach((c) => (initial[c.key] = true));
    return initial;
  });

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function setChoice(key: string, value: boolean) {
    setConsent((prev) => ({ ...prev, [key]: value }));
  }

  function confirm() {
    try {
      document.cookie = `privacy_consent=${encodeURIComponent(JSON.stringify(consent))}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
    setOpen(false);
    window.location.reload();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-accent hover:underline font-medium">
        {trigger}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-night/70" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-xl max-h-[88vh] bg-card border-2 border-accent rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <button
              onClick={() => setOpen(false)}
              aria-label="Zavrieť"
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-surface hover:text-ink text-xl leading-none z-10"
            >
              ×
            </button>

            <div className="px-6 pt-8 pb-4 flex justify-center flex-none border-b border-line">
              <Logo className="h-14 w-auto" />
            </div>

            <div className="px-6 py-5 overflow-y-auto flex-1">
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mb-6">{text}</p>

              <div className="text-xs font-bold uppercase tracking-wide text-muted mb-3">{t('privacy.povolujete')}</div>

              <div className="space-y-4">
                {categories.map((cat) => (
                  <div key={cat.key} className="flex items-start justify-between gap-4 pb-4 border-b border-line last:border-b-0">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink">{cat.title}</div>
                      {cat.description && <p className="text-xs text-muted mt-1">{cat.description}</p>}
                    </div>

                    {cat.mandatory ? (
                      <span className="flex-none text-[11px] font-semibold text-muted bg-surface border border-line px-3 py-1.5 rounded-full whitespace-nowrap">
                        {t('privacy.vzdy_aktivne')}
                      </span>
                    ) : (
                      <div className="flex-none flex rounded-lg overflow-hidden border border-line">
                        <button
                          onClick={() => setChoice(cat.key, false)}
                          className={`text-[11px] font-semibold px-3 py-1.5 whitespace-nowrap transition-colors ${
                            !consent[cat.key] ? 'bg-night text-white' : 'bg-card text-muted hover:text-ink'
                          }`}
                        >
                          {t('privacy.nesuhlasim')}
                        </button>
                        <button
                          onClick={() => setChoice(cat.key, true)}
                          className={`text-[11px] font-semibold px-3 py-1.5 whitespace-nowrap transition-colors border-l border-line ${
                            consent[cat.key] ? 'bg-accent text-white' : 'bg-card text-muted hover:text-ink'
                          }`}
                        >
                          {t('privacy.suhlasim')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-5 flex-none border-t border-line">
              <button
                onClick={confirm}
                className="w-full bg-accent text-white py-3 rounded-full text-sm font-semibold hover:bg-accent-dark"
              >
                {t('privacy.ulozit_nastavenia')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
