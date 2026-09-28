'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useT } from './TranslationProvider';

export default function QrLoginPanel() {
  const t = useT();
  const [qrSvg, setQrSvg] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [createError, setCreateError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Koľkokrát sa už kód obnovil sám. Po 3 obnoveniach (~9 minút bez
  // naskenovania) prestane a ukáže tlačidlo — otvorená, zabudnutá karta
  // s prihlásením tak nebude donekonečna zaťažovať databázu.
  const autoRenewals = useRef(0);
  const MAX_AUTO_RENEWALS = 3;

  function renewAutomatically() {
    if (autoRenewals.current >= MAX_AUTO_RENEWALS || document.visibilityState !== 'visible') {
      setExpired(true);
      setQrSvg('');
      setSessionId('');
      setExpiresAt(null);
      return;
    }
    autoRenewals.current += 1;
    createSession();
  }

  function renewManually() {
    autoRenewals.current = 0;
    createSession();
  }

  async function createSession() {
    setExpired(false);
    setCreateError('');
    setQrSvg('');
    try {
      const res = await fetch('/api/qr-login/create', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.id || !data.qrSvg) {
        setCreateError(data.error || 'Vytvorenie QR kódu zlyhalo.');
        return;
      }
      setSessionId(data.id);
      setQrSvg(data.qrSvg);
      // Podľa hodín prehliadača, nie servera (rozdiel času by spôsobil nekonečné obnovovanie).
      setExpiresAt(Date.now() + (Number(data.ttlSeconds) || 180) * 1000);
    } catch {
      setCreateError('Nepodarilo sa pripojiť k serveru.');
    }
  }

  useEffect(() => {
    createSession();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Odpočet platnosti — počíta sa priamo z "expiresAt", nech je presný aj
  // keby prehliadač na chvíľu zaspal (napr. karta na pozadí). Keď dôjde na
  // nulu, AUTOMATICKY načíta nový kód — používateľ nemusí nič klikať.
  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(null);
      return;
    }
    if (tickRef.current) clearInterval(tickRef.current);

    const tick = () => {
      const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        if (tickRef.current) clearInterval(tickRef.current);
        renewAutomatically();
      }
    };
    tick();
    tickRef.current = setInterval(tick, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  useEffect(() => {
    if (!sessionId) return;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      // Karta na pozadí sa nepýta — skontroluje sa hneď po návrate.
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`/api/qr-login/status/${sessionId}`);
        const data = await res.json();
        if (data.status === 'approved') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (tickRef.current) clearInterval(tickRef.current);
          setSigningIn(true);
          await signIn('credentials', { redirect: false, qrToken: sessionId });
          window.location.href = '/';
        } else if (data.status === 'expired') {
          if (pollRef.current) clearInterval(pollRef.current);
          // Obnovu kódu rieši odpočet (renewAutomatically) — tu už nie, inak by
          // vznikali dva nové kódy naraz.
          setSecondsLeft(0);
        }
      } catch {
        // Dočasný výpadok siete pri jednom pokuse nie je dôvod prestať skúšať —
        // ďalší pokus príde o pár sekúnd znova.
      }
    }, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (signingIn) {
    return <p className="text-sm text-white/70">{t('auth.prihlasujem')}</p>;
  }

  if (expired && !qrSvg) {
    return (
      <div className="text-center">
        <p className="text-xs text-white/60 mb-3">{t('auth.qr_vyprsal')}</p>
        <button type="button" onClick={renewManually} className="text-accent text-sm font-semibold hover:underline">
          {t('auth.qr_novy_kod')}
        </button>
      </div>
    );
  }

  if (createError) {
    return (
      <div className="text-center">
        <p className="text-xs text-red-400 mb-3">{createError}</p>
        <button type="button" onClick={renewManually} className="text-accent text-sm font-semibold hover:underline">
          {t('auth.qr_novy_kod')}
        </button>
      </div>
    );
  }

  if (!qrSvg) {
    return <div className="w-full h-full rounded-lg bg-white/10 animate-pulse" />;
  }

  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const ss = secondsLeft !== null ? secondsLeft % 60 : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-full h-full rounded-lg overflow-hidden bg-white p-2 [&>svg]:w-full [&>svg]:h-full"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      {secondsLeft !== null && (
        <p className="text-[11px] text-white/45">
          Platí ešte {mm}:{String(ss).padStart(2, '0')}
        </p>
      )}
    </div>
  );
}
