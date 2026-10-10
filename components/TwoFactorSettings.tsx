'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useT } from '@/components/TranslationProvider';

type Status = { enabled: boolean; enabledAt: string | null; backupCodesLeft: number; required: boolean };
type Setup = { secret: string; qrSvg: string; otpauthUrl: string };

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

async function post(path: string, body?: any) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Požadavek selhal.');
  return data;
}

// Nastavenia → Zabezpečení: zapnutie a správa dvojfaktorového overenia.
export default function TwoFactorSettings({ requiredNotice }: { requiredNotice?: boolean }) {
  const t = useT();
  const { update } = useSession();
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [dialog, setDialog] = useState<null | 'backup' | 'disable'>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  async function load() {
    const res = await fetch('/api/two-factor', { cache: 'no-store' });
    if (res.ok) setStatus(await res.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const startSetup = () =>
    run(async () => {
      setSetup(await post('/api/two-factor/setup'));
      setCode('');
    });

  const confirmSetup = () =>
    run(async () => {
      const data = await post('/api/two-factor/enable', { code, password });
      // Server zároveň odhlásil všetky zariadenia — po uložení kódov sa
      // prihlási znova, už s kódom z aplikácie.
      setCodes(data.backupCodes);
      setJustEnabled(true);
      setSetup(null);
      setCode('');
      setPassword('');
    });

  const newBackupCodes = () =>
    run(async () => {
      const data = await post('/api/two-factor/backup-codes', { code });
      setCodes(data.backupCodes);
      setDialog(null);
      setCode('');
      await load();
    });

  const disable = () =>
    run(async () => {
      await post('/api/two-factor/disable', { password, code });
      setDialog(null);
      setCode('');
      setPassword('');
      await update();
      await load();
    });

  function downloadCodes() {
    if (!codes) return;
    const text = `KrálFilmu.cz — ${t('2fa.zalozne_kody', 'Záložní kódy')}\n\n${codes.join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kralfilmu-zalozni-kody.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyCodes() {
    if (!codes) return;
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const btnPrimary = 'bg-accent text-white px-5 py-2.5 rounded text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-colors';
  const btnSecondary = 'border border-line bg-card text-ink px-4 py-2 rounded text-sm font-semibold hover:bg-surface disabled:opacity-50';
  const card = 'bg-card border border-line rounded-xl p-5 sm:p-6';

  if (!status) return <div className="max-w-2xl h-40 rounded-xl bg-surface animate-pulse" />;

  // --- Záložné kódy (po zapnutí alebo vygenerovaní nových) ---
  if (codes) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className={card}>
          <h2 className="font-display font-bold text-lg text-ink">{t('2fa.zalozne_kody', 'Záložní kódy')}</h2>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            {t('2fa.zalozne_popis', 'Když nebudeš mít telefon, přihlásíš se jedním z nich. Každý platí jen jednou. Ulož si je mimo počítač — znovu se už nezobrazí.')}
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 bg-surface rounded-lg px-5 py-4 my-4 font-mono text-[15px] text-ink">
            {codes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          {justEnabled && (
            <p className="text-sm text-ink bg-surface border border-line rounded-lg px-4 py-3 mb-4">
              {t('2fa.odhlasenie_info', 'Ověření je zapnuté a ze všech zařízení jsi byl odhlášen. Po uložení kódů se znovu přihlas — už s kódem z aplikace.')}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={downloadCodes} className={btnSecondary}>
              {t('2fa.stiahnut', 'Stáhnout (.txt)')}
            </button>
            <button type="button" onClick={copyCodes} className={btnSecondary}>
              {copied ? t('2fa.skopirovane', 'Zkopírováno') : t('2fa.kopirovat', 'Kopírovat')}
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => (justEnabled ? signOut({ callbackUrl: '/login' }) : setCodes(null))}
              className={btnPrimary}
            >
              {t('2fa.ulozil_som', 'Uložil jsem si je')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Zapnuté ---
  if (status.enabled) {
    const since = status.enabledAt ? new Date(status.enabledAt).toLocaleDateString('cs-CZ') : '';
    return (
      <div className="max-w-2xl space-y-4">
        <div className={`${card} flex flex-wrap items-center gap-3`}>
          <div className="flex-1 min-w-[220px]">
            <div className="font-semibold text-ink flex items-center gap-2 flex-wrap">
              {t('2fa.nadpis', 'Dvoufázové ověření')}
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">{t('2fa.zapnute', 'Zapnuto')}</span>
            </div>
            <div className="text-sm text-muted mt-1">
              {t('2fa.aplikacia', 'Ověřovací aplikace')} · {t('2fa.zapnute_od', 'zapnuto')} {since} · {t('2fa.zostava_kodov', 'zbývá záložních kódů:')} {status.backupCodesLeft}
            </div>
          </div>
          <button type="button" onClick={() => { setDialog('backup'); setCode(''); setError(''); }} className={btnSecondary}>
            {t('2fa.nove_kody', 'Nové záložní kódy')}
          </button>
          {!status.required && (
            <button type="button" onClick={() => { setDialog('disable'); setCode(''); setPassword(''); setError(''); }} className={`${btnSecondary} !text-accent`}>
              {t('2fa.vypnut', 'Vypnout')}
            </button>
          )}
        </div>
        {status.required && <p className="text-xs text-muted px-1">{t('2fa.povinne_info', 'Administrátoři a redaktoři musí mít dvoufázové ověření zapnuté — vypnout ho nelze.')}</p>}

        {dialog && (
          <div className={card}>
            <h3 className="font-semibold text-ink mb-1">{dialog === 'backup' ? t('2fa.nove_kody', 'Nové záložní kódy') : t('2fa.vypnut_nadpis', 'Vypnout dvoufázové ověření')}</h3>
            <p className="text-sm text-muted mb-4">
              {dialog === 'backup'
                ? t('2fa.nove_kody_popis', 'Staré záložní kódy přestanou platit. Potvrď aktuálním kódem z aplikace.')
                : t('2fa.vypnut_popis', 'Pro vypnutí zadej heslo a aktuální kód z aplikace (nebo záložní kód).')}
            </p>
            <div className="space-y-3 max-w-sm">
              {dialog === 'disable' && (
                <input type="password" className="field-input" placeholder={t('auth.heslo')} value={password} onChange={(e) => setPassword(e.target.value)} />
              )}
              <input className="field-input font-mono tracking-widest" placeholder="123 456" value={code} onChange={(e) => setCode(e.target.value.slice(0, 12))} autoComplete="one-time-code" />
            </div>
            {error && <div className="text-danger text-sm mt-3">{error}</div>}
            <div className="flex gap-2.5 mt-4">
              <button type="button" disabled={busy || !code || (dialog === 'disable' && !password)} onClick={dialog === 'backup' ? newBackupCodes : disable} className={btnPrimary}>
                {dialog === 'backup' ? t('2fa.vygenerovat', 'Vygenerovat') : t('2fa.vypnut', 'Vypnout')}
              </button>
              <button type="button" onClick={() => setDialog(null)} className={btnSecondary}>
                {t('2fa.zrusit', 'Zrušit')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Nastavenie: QR kód + potvrdenie ---
  if (setup) {
    const steps = [t('2fa.krok_naskenuj', 'Naskenuj kód'), t('2fa.krok_potvrd', 'Potvrď kód'), t('2fa.krok_kody', 'Záložní kódy')];
    return (
      <div className="max-w-2xl">
        <div className={card}>
          <div className="flex items-center gap-2.5 text-xs text-muted mb-5">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2.5 flex-1 last:flex-none">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${i === 0 ? 'bg-accent text-white' : 'bg-surface2 text-muted'}`}>{i + 1}</span>
                <span className="whitespace-nowrap">{s}</span>
                {i < steps.length - 1 && <span className="flex-1 h-px bg-line hidden sm:block" />}
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-44 h-44 flex-none rounded-lg border border-line bg-white p-2 [&_svg]:w-full [&_svg]:h-full" dangerouslySetInnerHTML={{ __html: setup.qrSvg }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink leading-relaxed mb-3">
                {t('2fa.navod', 'V ověřovací aplikaci zvol Přidat účet a naskenuj kód. Nejde to? Zadej klíč ručně:')}
              </p>
              <div className="font-mono text-sm bg-surface rounded-md px-3 py-2.5 mb-2 break-all select-all text-ink">{setup.secret}</div>
              {/* Na telefóne: otvorí overovaciu aplikáciu priamo s týmto účtom */}
              <a href={setup.otpauthUrl} className="sm:hidden inline-block text-sm font-semibold text-accent hover:underline mb-3">
                {t('2fa.otvorit_v_aplikacii', 'Otevřít v ověřovací aplikaci')}
              </a>
              <label className="block text-sm text-muted mb-2 mt-2">{t('auth.heslo')}</label>
              <input type="password" className="field-input mb-3" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <label className="block text-sm text-muted mb-2">{t('2fa.kod_z_aplikacie', 'Kód z aplikace')}</label>
              <div className="flex gap-2.5">
                <input
                  className="field-input font-mono tracking-[0.3em] flex-1"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button type="button" disabled={busy || code.length !== 6 || !password} onClick={confirmSetup} className={btnPrimary}>
                  {t('2fa.potvrdit', 'Potvrdit')}
                </button>
              </div>
              {error && <div className="text-danger text-sm mt-3">{error}</div>}
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setSetup(null)} className="text-sm text-muted hover:text-ink mt-3">
          {t('2fa.zrusit', 'Zrušit')}
        </button>
      </div>
    );
  }

  // --- Vypnuté ---
  const mustSetUp = status.required || requiredNotice;
  return (
    <div className="max-w-2xl">
      <div className={card}>
        <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
          <ShieldIcon />
        </div>
        <h2 className="font-display font-bold text-xl text-ink mb-2">
          {mustSetUp ? t('2fa.zapni_nadpis', 'Zapni dvoufázové ověření') : t('2fa.nadpis', 'Dvoufázové ověření')}
        </h2>
        <p className="text-sm text-muted leading-relaxed mb-5">
          {mustSetUp
            ? t('2fa.povinne_popis', 'Administrace je od teď přístupná jen s druhým krokem přihlášení. Nastavení zabere asi minutu — potřebuješ jen telefon s ověřovací aplikací.')
            : t('2fa.popis', 'Při přihlášení zadáš kromě hesla i kód z aplikace v telefonu. I když někdo zjistí tvoje heslo, bez telefonu se k účtu nedostane.')}
        </p>
        {error && <div className="text-danger text-sm mb-3">{error}</div>}
        <button type="button" disabled={busy} onClick={startSetup} className={btnPrimary}>
          {mustSetUp ? t('2fa.nastavit_teraz', 'Nastavit teď') : t('2fa.zapnut', 'Zapnout')}
        </button>
      </div>
    </div>
  );
}
