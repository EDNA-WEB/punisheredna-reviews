'use client';

import { useState } from 'react';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const checks = [
    { label: 'aspoň 8 znakov', valid: newPassword.length >= 8 },
    { label: 'veľké písmeno', valid: /[A-Z]/.test(newPassword) },
    { label: 'malé písmeno', valid: /[a-z]/.test(newPassword) },
    { label: 'číslicu', valid: /[0-9]/.test(newPassword) }
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Nové heslá sa nezhodujú.');
      return;
    }
    if (checks.some((c) => !c.valid)) {
      setError('Nové heslo nespĺňa všetky požiadavky nižšie.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Zmena hesla zlyhala.');
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-5 pt-8 mt-8 border-t border-line">
      <h2 className="font-display font-bold text-lg text-ink">Zmena hesla</h2>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Súčasné heslo</label>
        <input type="password" className="field-input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Nové heslo</label>
        <input type="password" className="field-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        <ul className="mt-2 space-y-0.5">
          {checks.map((c) => (
            <li key={c.label} className={`text-xs flex items-center gap-1.5 ${c.valid ? 'text-emerald-600' : 'text-muted'}`}>
              <span>{c.valid ? '✓' : '·'}</span> {c.label}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Zopakuj nové heslo</label>
        <input type="password" className="field-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
      </div>

      {error && <div className="text-danger text-sm">{error}</div>}
      {success && <div className="text-emerald-600 text-sm font-semibold">Heslo bolo úspešne zmenené.</div>}

      <button
        type="submit"
        disabled={loading}
        className="bg-night text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-night/85 disabled:opacity-50"
      >
        {loading ? 'Ukladám…' : 'Zmeniť heslo'}
      </button>
    </form>
  );
}
