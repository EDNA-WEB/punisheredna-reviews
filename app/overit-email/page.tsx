'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Chýba overovací token v odkaze.');
      return;
    }
    fetch('/api/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStatus('ok');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Overenie zlyhalo.');
      });
  }, [token]);

  return (
    <div className="max-w-md mx-auto pt-16 text-center">
      {status === 'loading' && <p className="text-muted">Ověřuji tvůj e-mail…</p>}
      {status === 'ok' && (
        <>
          <h1 className="font-display font-extrabold text-2xl text-ink mb-3">E-mail overený! ✅</h1>
          <p className="text-muted mb-6">Tvůj účet je teď plně aktivní. Můžeš se přihlásit.</p>
          <Link href="/login" className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark">
            Přihlásit se
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="font-display font-extrabold text-2xl text-ink mb-3">Ověření se nezdařilo</h1>
          <p className="text-danger mb-6">{message}</p>
          <Link href="/login" className="text-accent font-semibold hover:underline">Zpět na přihlášení</Link>
        </>
      )}
    </div>
  );
}
