'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/components/TranslationProvider';

type Prefs = { email: string; emailVerified: boolean; news: boolean; online: boolean; messages: boolean };
type Key = 'news' | 'online' | 'messages';

function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative w-12 h-7 rounded-full flex-none transition-colors disabled:opacity-50 ${on ? 'bg-accent' : 'bg-line'}`}
    >
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

// Nastavení → Oznámení: e-mailové oznámenia (novinky, film je online, nová správa).
export default function EmailPreferencesForm() {
  const t = useT();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [error, setError] = useState('');
  const [verifyState, setVerifyState] = useState<'idle' | 'busy' | 'sent'>('idle');

  useEffect(() => {
    fetch('/api/email-preferences')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPrefs)
      .catch(() => setError(t('emailpref.chyba_nacitania', 'Nastavení se nepodařilo načíst.')));
  }, []);

  async function save(patch: Partial<Record<Key, boolean>>) {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, ...patch });
    setError('');
    try {
      const res = await fetch('/api/email-preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error();
      setPrefs(await res.json());
    } catch {
      setPrefs(previous);
      setError(t('emailpref.chyba_ulozenia', 'Změnu se nepodařilo uložit.'));
    }
  }

  async function sendVerification() {
    setVerifyState('busy');
    try {
      const res = await fetch('/api/email-preferences', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setVerifyState('sent');
    } catch (e: any) {
      setVerifyState('idle');
      setError(e.message || t('email.chyba_odoslania', 'E-mail se nepodařilo odeslat. Zkus to prosím znovu.'));
    }
  }

  const rows: { key: Key; title: string; hint: string }[] = [
    { key: 'news', title: t('emailpref.news', 'Novinky z KrálFilmu'), hint: t('emailpref.news_hint', 'Výběr důležitých novinek, nejvýš několikrát za měsíc.') },
    {
      key: 'online',
      title: t('emailpref.online', 'Film z Chci vidět nebo Oblíbených je online'),
      hint: t('emailpref.online_hint', 'Když filmu nebo seriálu z tvých seznamů přibude online odkaz.')
    },
    {
      key: 'messages',
      title: t('emailpref.messages', 'Nová zpráva v poště'),
      hint: t('emailpref.messages_hint', 'Když ti někdo napíše a zprávu si do pár minut nepřečteš. Z jedné konverzace nejvýš jeden e-mail za hodinu.')
    }
  ];

  return (
    <div className="max-w-xl">
      <div className="text-xs font-bold uppercase tracking-wider text-muted">{t('emailpref.nadpis', 'E-mailová oznámení')}</div>
      {prefs && (
        <p className="text-sm text-muted mt-1.5">
          {t('emailpref.posielame_na', 'Posíláme na')} <b className="text-ink">{prefs.email}</b>
        </p>
      )}

      {prefs && !prefs.emailVerified && (
        <div className="mt-4 border border-amber-400/40 bg-amber-400/10 rounded-xl p-4 text-sm">
          <p className="text-ink">{t('emailpref.neovereny', 'Tvůj e-mail ještě není ověřený, oznámení ti proto zatím nechodí.')}</p>
          {verifyState === 'sent' ? (
            <p className="text-emerald-600 font-semibold mt-2">{t('email.odkaz_odoslany', 'Nový odkaz je na cestě.')}</p>
          ) : (
            <button type="button" onClick={sendVerification} disabled={verifyState === 'busy'} className="mt-2 font-semibold text-accent hover:underline disabled:opacity-50">
              {t('emailpref.overit', 'Poslat ověřovací e-mail')}
            </button>
          )}
        </div>
      )}

      <div className="mt-3 divide-y divide-line border-y border-line">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-6 py-4">
            <div>
              <div className="font-semibold text-ink text-[15px]">{r.title}</div>
              <div className="text-sm text-muted mt-0.5 leading-snug">{r.hint}</div>
            </div>
            <Toggle on={!!prefs?.[r.key]} disabled={!prefs} label={r.title} onChange={(v) => save({ [r.key]: v })} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <span className="text-xs text-muted">{t('emailpref.ucet_vzdy', 'E-maily k účtu (ověření, obnovení hesla) chodí vždy.')}</span>
        <button
          type="button"
          disabled={!prefs}
          onClick={() => save({ news: false, online: false, messages: false })}
          className="text-sm font-semibold px-4 py-2 rounded-lg border border-line bg-card text-ink hover:border-accent disabled:opacity-50"
        >
          {t('emailpref.vypnut_vsetko', 'Vypnout všechny')}
        </button>
      </div>
      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
    </div>
  );
}
