'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_PRIVACY_CATEGORIES, parseConsentCookie } from '@/lib/privacyDefaults';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

function writeConsentCookie(consent: Record<string, boolean>) {
  document.cookie = `privacy_consent=${encodeURIComponent(JSON.stringify(consent))}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [choices, setChoices] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    DEFAULT_PRIVACY_CATEGORIES.forEach((c) => (initial[c.key] = c.mandatory));
    return initial;
  });

  useEffect(() => {
    // Banner sa zobrazí len vtedy, keď ešte nikdy nepadlo žiadne rozhodnutie —
    // ak si niekto voľby už nastavil (hoci aj cez pätičku), nič sa nepýta znova.
    const raw = readCookie('privacy_consent');
    if (parseConsentCookie(raw) === null) setVisible(true);
  }, []);

  function save(consent: Record<string, boolean>) {
    writeConsentCookie(consent);
    setVisible(false);
    window.dispatchEvent(new Event('privacy-consent-updated'));
  }

  function acceptAll() {
    const all: Record<string, boolean> = {};
    DEFAULT_PRIVACY_CATEGORIES.forEach((c) => (all[c.key] = true));
    save(all);
  }

  function rejectOptional() {
    const minimal: Record<string, boolean> = {};
    DEFAULT_PRIVACY_CATEGORIES.forEach((c) => (minimal[c.key] = c.mandatory));
    save(minimal);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] p-4 sm:p-5">
      <div className="max-w-2xl mx-auto bg-card border border-line rounded-xl shadow-2xl p-5">
        {!settingsOpen ? (
          <>
            <h2 className="font-display font-bold text-base text-ink mb-1.5">🍪 Používame cookies</h2>
            <p className="text-sm text-muted leading-relaxed mb-4">
              Nevyhnutné cookies používame vždy. Štatistiku návštevnosti a ďalšie voliteľné cookies používame len
              s tvojím súhlasom. Podrobnosti nájdeš v pätičke stránky pod "Nastavenie súkromia".
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={acceptAll}
                className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark transition-colors"
              >
                Prijať všetko
              </button>
              <button
                onClick={rejectOptional}
                className="text-sm font-semibold text-ink border border-line px-5 py-2.5 rounded-full hover:border-accent hover:text-accent transition-colors"
              >
                Odmietnuť voliteľné
              </button>
              <button onClick={() => setSettingsOpen(true)} className="text-sm font-semibold text-muted hover:text-ink px-3 py-2.5">
                Nastavenia
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display font-bold text-base text-ink mb-4">Nastavenia cookies</h2>
            <div className="space-y-3 mb-5 max-h-[45vh] overflow-y-auto">
              {DEFAULT_PRIVACY_CATEGORIES.map((cat) => (
                <div key={cat.key} className="flex items-start justify-between gap-4 border border-line rounded-lg p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">{cat.title}</div>
                    <div className="text-xs text-muted mt-0.5">{cat.description}</div>
                  </div>
                  {cat.mandatory ? (
                    <span className="flex-none text-[11px] font-semibold text-muted bg-surface border border-line px-3 py-1.5 rounded-full whitespace-nowrap">
                      Vždy aktívne
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setChoices((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                      className={`w-10 h-6 rounded-full flex items-center px-1 flex-none transition-colors ${
                        choices[cat.key] ? 'bg-accent' : 'bg-line'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${choices[cat.key] ? 'translate-x-4' : ''}`} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => save(choices)}
                className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark transition-colors"
              >
                Uložiť nastavenia
              </button>
              <button onClick={() => setSettingsOpen(false)} className="text-sm font-semibold text-muted hover:text-ink px-3 py-2.5">
                Späť
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
