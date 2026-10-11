'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Initial = { operatorName: string | null; operatorCompanyId: string | null; operatorAddress: string | null; operatorEmail: string | null };

// Administrace → Vzhled webu: údaje pre stránku /provozovatel. Prázdne polia sa nezobrazia.
export default function OperatorInfoForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [v, setV] = useState({
    operatorName: initial.operatorName || '',
    operatorCompanyId: initial.operatorCompanyId || '',
    operatorAddress: initial.operatorAddress || '',
    operatorEmail: initial.operatorEmail || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/admin/operator', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Uložení selhalo.');
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const field = (key: keyof typeof v, label: string, placeholder: string) => (
    <div>
      <label className="block text-sm font-semibold text-ink mb-1.5">{label}</label>
      <input className="field-input" value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} placeholder={placeholder} />
    </div>
  );

  return (
    <div className="max-w-xl space-y-3">
      {field('operatorName', 'Provozovatel (jméno a příjmení / název firmy)', 'Jan Novák')}
      {field('operatorCompanyId', 'IČO (nepovinné)', '12345678')}
      {field('operatorAddress', 'Sídlo / adresa', 'Ulice 1, 000 00 Obec, Slovensko')}
      {field('operatorEmail', 'Kontaktní e-mail', 'kontakt@kralfilmu.cz')}
      {error && <div className="text-danger text-sm">{error}</div>}
      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={save} disabled={loading} className="bg-night text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-night/85 disabled:opacity-50">
          {loading ? 'Ukládám…' : 'Uložit'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-semibold">Uloženo</span>}
        <a href="/provozovatel" target="_blank" className="text-sm text-accent font-semibold hover:underline">Zobrazit stránku</a>
      </div>
    </div>
  );
}
