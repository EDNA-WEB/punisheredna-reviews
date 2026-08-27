'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_PRIVACY_TEXT, DEFAULT_PRIVACY_CATEGORIES, PrivacyCategory } from '@/lib/privacyDefaults';

export default function PrivacyModalTextForm({
  initialText,
  initialCategories
}: {
  initialText: string | null;
  initialCategories: string | null;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText || DEFAULT_PRIVACY_TEXT);
  const [categories, setCategories] = useState<PrivacyCategory[]>(() => {
    if (!initialCategories) return DEFAULT_PRIVACY_CATEGORIES;
    try {
      const parsed = JSON.parse(initialCategories);
      if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PRIVACY_CATEGORIES;
      return parsed.map((c: any, i: number) => ({ ...c, key: c.key || `custom-${i}` }));
    } catch {
      return DEFAULT_PRIVACY_CATEGORIES;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function updateCategory(i: number, field: keyof PrivacyCategory, value: string | boolean) {
    setCategories((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
    setSaved(false);
  }

  function addCategory() {
    setCategories((prev) => [...prev, { key: `custom-${Date.now()}`, title: 'Nová kategória', description: '', mandatory: false }]);
  }

  function removeCategory(i: number) {
    setCategories((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacyModalText: text, privacyCategories: JSON.stringify(categories) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setSaved(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Úvodný text</label>
        <textarea
          className="field-input min-h-[100px] text-sm"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          maxLength={10000}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-ink">Kategórie súhlasu</label>
          <button type="button" onClick={addCategory} className="text-xs font-semibold text-accent hover:underline">
            + Pridať kategóriu
          </button>
        </div>

        <div className="space-y-3">
          {categories.map((cat, i) => (
            <div key={i} className="border border-line rounded-xl p-3 bg-surface space-y-2">
              <div className="flex items-center gap-2">
                <input
                  className="field-input-sm flex-1"
                  value={cat.title}
                  onChange={(e) => updateCategory(i, 'title', e.target.value)}
                  placeholder="Názov kategórie"
                />
                <button type="button" onClick={() => removeCategory(i)} className="text-xs text-muted hover:text-danger flex-none px-2">
                  Zmazať
                </button>
              </div>
              <textarea
                className="field-input-sm min-h-[50px]"
                value={cat.description}
                onChange={(e) => updateCategory(i, 'description', e.target.value)}
                placeholder="Popis kategórie"
              />
              <label className="flex items-center gap-2 text-xs text-ink cursor-pointer w-fit">
                <input type="checkbox" checked={cat.mandatory} onChange={(e) => updateCategory(i, 'mandatory', e.target.checked)} className="w-3.5 h-3.5 accent-accent" />
                Povinná (bez možnosti vypnúť — napr. technická prevádzka)
              </label>
            </div>
          ))}
          {categories.length === 0 && <p className="text-sm text-muted">Zatiaľ žiadne kategórie.</p>}
        </div>
      </div>

      {error && <div className="text-danger text-sm">{error}</div>}
      {saved && !error && <div className="text-emerald-600 text-sm font-semibold">Uložené.</div>}
      <button onClick={save} disabled={loading} className="bg-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
        {loading ? 'Ukladám…' : 'Uložiť'}
      </button>
    </div>
  );
}
