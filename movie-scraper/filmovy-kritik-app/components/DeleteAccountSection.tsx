'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function deleteAccount() {
    if (!confirm('Toto naozaj nezvratne zmaže tvoj účet — prihlásiť sa ním už nepôjde. Tvoje recenzie a príspevky zostanú zachované, ale bez tvojho mena a fotky. Pokračovať?')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/profile/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Vymazanie zlyhalo.');
      await signOut({ callbackUrl: '/' });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="border border-danger/30 rounded-xl p-4 mt-8">
      <div className="text-xs font-bold uppercase tracking-wide text-danger mb-2">Nebezpečná zóna</div>

      {!open ? (
        <button onClick={() => setOpen(true)} className="text-xs font-semibold text-danger hover:underline">
          Zmazať účet
        </button>
      ) : (
        <div className="space-y-3 max-w-xs">
          <p className="text-xs text-muted leading-relaxed">
            Tvoje recenzie, komentáre a príspevky zostanú na webe zachované, ale namiesto tvojej prezývky sa pri nich
            zobrazí "Zmazaný používateľ" — bez fotky a bez akýchkoľvek osobných údajov. Túto akciu nejde vrátiť späť.
          </p>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Zadaj svoje heslo pre potvrdenie</label>
            <input
              type="password"
              className="field-input-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-danger text-xs">{error}</div>}
          <div className="flex items-center gap-2.5">
            <button
              onClick={deleteAccount}
              disabled={loading || !password}
              className="bg-danger text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Mažem…' : 'Natrvalo zmazať účet'}
            </button>
            <button onClick={() => setOpen(false)} className="text-xs text-muted hover:text-ink">
              Zrušiť
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
