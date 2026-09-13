'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from './TranslationProvider';

const LANGUAGES = [
  { code: 'sk', label: 'Slovenčina' },
  { code: 'en', label: 'English' },
  { code: 'cs', label: 'Čeština' }
];

export default function LanguageTimezoneForm({ initialLanguage, initialTimezone }: { initialLanguage: string; initialTimezone: string | null }) {
  const t = useT();
  const router = useRouter();
  const [language, setLanguage] = useState(initialLanguage);
  const [timezone, setTimezone] = useState(initialTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState('');

  async function save() {
    setSaving(true);
    setSaved(false);
    setNotice('');
    try {
      const res = await fetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, timezone })
      });
      const data = await res.json();
      if (data.saved === false) {
        setNotice(data.error);
      } else {
        setSaved(true);
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-8">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">{t('settings.jazyk')}</label>
        <select className="field-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        {language !== 'sk' && (
          <p className="text-xs text-muted mt-1.5">
            Preklad webu do tohto jazyka postupne pribúda — zatiaľ sa ti uloží tvoja voľba, obsah sa dopĺňa priebežne.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">{t('settings.casove_pasmo')}</label>
        <input className="field-input" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="napr. Europe/Bratislava" />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
          {saving ? 'Ukladám…' : t('settings.ulozit')}
        </button>
        {saved && <span className="text-emerald-600 text-sm font-semibold">Uložené.</span>}
        {notice && <span className="text-amber-700 text-sm font-semibold">{notice}</span>}
      </div>
    </div>
  );
}
