'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Initial = {
  name: string;
  bio: string;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  birthDate: string | null;
  tagline: string | null;
  email: string | null;
  hideEmail: boolean;
  homepage: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  xUrl: string | null;
  youtubeUrl: string | null;
  spotifyUrl: string | null;
  linkedinUrl: string | null;
  snapchatUrl: string | null;
  blueskyUrl: string | null;
  country: string | null;
  region: string | null;
};

const CONTACT_FIELDS: { key: keyof Initial; label: string }[] = [
  { key: 'homepage', label: 'Homepage' },
  { key: 'blueskyUrl', label: 'Bluesky' },
  { key: 'xUrl', label: 'X' },
  { key: 'tiktokUrl', label: 'TikTok' },
  { key: 'facebookUrl', label: 'Facebook' },
  { key: 'instagramUrl', label: 'Instagram' },
  { key: 'snapchatUrl', label: 'Snapchat' },
  { key: 'spotifyUrl', label: 'Spotify' },
  { key: 'linkedinUrl', label: 'LinkedIn' },
  { key: 'youtubeUrl', label: 'YouTube' }
];

function Section({ title, children, onSave, saving, isSaved, error }: {
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  isSaved: boolean;
  error: string;
}) {
  return (
    <div className="border border-line rounded-xl bg-surface mb-4 overflow-hidden">
      <div className="px-5 py-2.5 border-b border-line text-xs font-bold uppercase tracking-wide text-muted">{title}</div>
      <div className="p-5">{children}</div>
      <div className="px-5 py-3 border-t border-line flex items-center justify-end gap-3">
        {error && <span className="text-danger text-xs">{error}</span>}
        {isSaved && !error && <span className="text-emerald-600 text-xs font-semibold">Uložené.</span>}
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-accent text-white px-5 py-1.5 rounded-full text-xs font-semibold hover:bg-accent-dark disabled:opacity-50"
        >
          {saving ? 'Ukladám…' : 'Uložiť'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-2 border-b border-line last:border-b-0">
      <label className="w-40 flex-none text-sm font-semibold text-ink">{label}</label>
      <div className="max-w-sm flex-1">{children}</div>
    </div>
  );
}

export default function AccountSettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  function set<K extends keyof Initial>(key: K, value: Initial[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(null);
  }

  async function save(section: string, fields: (keyof Initial)[]) {
    setSavingSection(section);
    setError('');
    setSaved(null);
    try {
      const payload: Record<string, any> = {};
      for (const f of fields) payload[f] = form[f];
      const res = await fetch('/api/profile/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setSaved(section);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSection(null);
    }
  }

  return (
    <div>
      <Section
        title="Osobné údaje"
        onSave={() => save('osobne', ['firstName', 'lastName', 'gender', 'birthDate', 'tagline', 'hideEmail'])}
        saving={savingSection === 'osobne'}
        isSaved={saved === 'osobne'}
        error={savingSection === 'osobne' ? error : ''}
      >
        <Field label="Meno">
          <input className="field-input-sm" value={form.firstName || ''} onChange={(e) => set('firstName', e.target.value)} />
        </Field>
        <Field label="Priezvisko">
          <input className="field-input-sm" value={form.lastName || ''} onChange={(e) => set('lastName', e.target.value)} />
        </Field>
        <Field label="Pohlavie">
          <select className="field-input-sm" value={form.gender || ''} onChange={(e) => set('gender', e.target.value)}>
            <option value="">— neuvedené —</option>
            <option value="muž">muž</option>
            <option value="žena">žena</option>
          </select>
        </Field>
        <Field label="Dátum narodenia">
          <input type="date" className="field-input-sm" value={form.birthDate || ''} onChange={(e) => set('birthDate', e.target.value)} />
        </Field>
        <Field label="Kto som / čím som">
          <input className="field-input-sm" value={form.tagline || ''} onChange={(e) => set('tagline', e.target.value)} maxLength={50} placeholder="max. 50 znakov" />
        </Field>
        <Field label="E-mail">
          <div className="flex items-center gap-3 flex-wrap">
            <input className="field-input-sm bg-card flex-1 min-w-[160px]" value={form.email || ''} disabled />
            <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={form.hideEmail} onChange={(e) => set('hideEmail', e.target.checked)} className="w-3.5 h-3.5 accent-accent" />
              nezverejňovať
            </label>
          </div>
        </Field>
      </Section>

      <Section
        title="Kontakty"
        onSave={() => save('kontakty', CONTACT_FIELDS.map((c) => c.key))}
        saving={savingSection === 'kontakty'}
        isSaved={saved === 'kontakty'}
        error={savingSection === 'kontakty' ? error : ''}
      >
        {CONTACT_FIELDS.map(({ key, label }) => (
          <Field key={key} label={label}>
            <input
              className="field-input-sm"
              value={(form[key] as string) || ''}
              onChange={(e) => set(key, e.target.value as any)}
              placeholder="https://…"
            />
          </Field>
        ))}
      </Section>

      <Section
        title="Lokalizácia"
        onSave={() => save('lokalizacia', ['country', 'region'])}
        saving={savingSection === 'lokalizacia'}
        isSaved={saved === 'lokalizacia'}
        error={savingSection === 'lokalizacia' ? error : ''}
      >
        <Field label="Krajina">
          <input className="field-input-sm" value={form.country || ''} onChange={(e) => set('country', e.target.value)} placeholder="napr. Česko" />
        </Field>
        <Field label="Okres / kraj">
          <input className="field-input-sm" value={form.region || ''} onChange={(e) => set('region', e.target.value)} placeholder="napr. Praha" />
        </Field>
      </Section>

      <div className="border border-line rounded-xl bg-surface overflow-hidden">
        <div className="px-5 py-2.5 border-b border-line text-xs font-bold uppercase tracking-wide text-muted">Súhlas s podmienkami</div>
        <div className="p-5">
          <p className="text-xs text-muted leading-relaxed max-w-2xl">
            Registráciou a používaním PunisherEDNA reviews súhlasíš so spracovaním svojich údajov v rozsahu popísanom v{' '}
            <Link href="/cookies" className="text-accent font-semibold hover:underline">zásadách webu</Link>. Ak si svoj názor
            rozmyslíš, napíš nám cez{' '}
            <Link href="/napis-nam" className="text-accent font-semibold hover:underline">kontaktný formulár</Link> a účet ti
            zmažeme.
          </p>
        </div>
      </div>
    </div>
  );
}
