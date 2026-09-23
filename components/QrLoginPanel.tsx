'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useT } from './TranslationProvider';

export default function QrLoginPanel() {
  const t = useT();
  const [qrSvg, setQrSvg] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [expired, setExpired] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function createSession() {
    setExpired(false);
    setQrSvg('');
    try {
      const res = await fetch('/api/qr-login/create', { method: 'POST' });
      const data = await res.json();
      setSessionId(data.id);
      setQrSvg(data.qrSvg);
    } catch {
      setExpired(true);
    }
  }

  useEffect(() => {
    createSession();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/qr-login/status/${sessionId}`);
        const data = await res.json();
        if (data.status === 'approved') {
          if (pollRef.current) clearInterval(pollRef.current);
          setSigningIn(true);
          await signIn('credentials', { redirect: false, qrToken: sessionId });
          window.location.href = '/';
        } else if (data.status === 'expired') {
          if (pollRef.current) clearInterval(pollRef.current);
          setExpired(true);
        }
      } catch {
        // Dočasný výpadok siete pri jednom pokuse nie je dôvod prestať skúšať —
        // ďalší pokus príde o pár sekúnd znova.
      }
    }, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId]);

  if (signingIn) {
    return <p className="text-sm text-white/70">{t('auth.prihlasujem')}</p>;
  }

  if (expired) {
    return (
      <div className="text-center">
        <p className="text-sm text-white/60 mb-3">{t('auth.qr_vyprsal')}</p>
        <button type="button" onClick={createSession} className="text-accent text-sm font-semibold hover:underline">
          {t('auth.qr_novy_kod')}
        </button>
      </div>
    );
  }

  if (!qrSvg) {
    return <div className="w-full h-full rounded-lg bg-white/10 animate-pulse" />;
  }

  return (
    <div
      className="w-full h-full rounded-lg overflow-hidden bg-white p-2 [&>svg]:w-full [&>svg]:h-full"
      dangerouslySetInnerHTML={{ __html: qrSvg }}
    />
  );
}
