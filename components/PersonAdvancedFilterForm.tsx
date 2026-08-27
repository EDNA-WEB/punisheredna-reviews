'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PERSON_TYPES } from '@/lib/filterConstants';

export default function PersonAdvancedFilterForm({ birthPlaces, deathPlaces }: { birthPlaces: string[]; deathPlaces: string[] }) {
  const router = useRouter();

  const [types, setTypes] = useState<string[]>([]);
  const [birthPlace, setBirthPlace] = useState('');
  const [deathPlace, setDeathPlace] = useState('');
  const [birthYearFrom, setBirthYearFrom] = useState('');
  const [birthYearTo, setBirthYearTo] = useState('');
  const [deathYearFrom, setDeathYearFrom] = useState('');
  const [deathYearTo, setDeathYearTo] = useState('');
  const [hasBio, setHasBio] = useState(false);

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function reset() {
    setTypes([]);
    setBirthPlace('');
    setDeathPlace('');
    setBirthYearFrom('');
    setBirthYearTo('');
    setDeathYearFrom('');
    setDeathYearTo('');
    setHasBio(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (types.length) params.set('types', types.join(','));
    if (birthPlace) params.set('birthPlace', birthPlace);
    if (deathPlace) params.set('deathPlace', deathPlace);
    if (birthYearFrom) params.set('birthYearFrom', birthYearFrom);
    if (birthYearTo) params.set('birthYearTo', birthYearTo);
    if (deathYearFrom) params.set('deathYearFrom', deathYearFrom);
    if (deathYearTo) params.set('deathYearTo', deathYearTo);
    if (hasBio) params.set('hasBio', '1');
    router.push(`/osoby?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="border border-line border-t-0 rounded-b bg-card overflow-hidden">
      <div className="bg-surface px-4 py-2 border-b border-line">
        <h1 className="font-display font-bold text-sm text-ink">Zadaj požadované filtre</h1>
      </div>

      <div className="p-4 grid md:grid-cols-[1fr_1fr_170px] gap-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">Typ</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {PERSON_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} className="w-3.5 h-3.5 accent-accent flex-none" />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">Miesto narodenia</div>
            <select className="field-input-sm mb-2" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)}>
              <option value="">— vyber —</option>
              {birthPlaces.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1 mt-3">Dátum narodenia (rok)</div>
            <div className="flex items-center gap-1">
              <input type="number" className="field-input-sm" placeholder="od" value={birthYearFrom} onChange={(e) => setBirthYearFrom(e.target.value)} />
              <input type="number" className="field-input-sm" placeholder="do" value={birthYearTo} onChange={(e) => setBirthYearTo(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">Miesto úmrtia</div>
            <select className="field-input-sm mb-2" value={deathPlace} onChange={(e) => setDeathPlace(e.target.value)}>
              <option value="">— vyber —</option>
              {deathPlaces.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1 mt-3">Dátum úmrtia (rok)</div>
            <div className="flex items-center gap-1">
              <input type="number" className="field-input-sm" placeholder="od" value={deathYearFrom} onChange={(e) => setDeathYearFrom(e.target.value)} />
              <input type="number" className="field-input-sm" placeholder="do" value={deathYearTo} onChange={(e) => setDeathYearTo(e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">Doplňujúce filtre</div>
          <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
            <input type="checkbox" checked={hasBio} onChange={(e) => setHasBio(e.target.checked)} className="w-3.5 h-3.5 accent-accent" />
            s biografiou
          </label>
        </div>
      </div>

      <div className="bg-surface px-4 py-3 border-t border-line flex items-center justify-center gap-2.5">
        <button type="submit" className="bg-accent text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-accent-dark">
          Hľadať
        </button>
        <button type="button" onClick={reset} className="border border-line text-muted px-5 py-2 rounded-full text-xs font-semibold hover:text-ink hover:border-ink">
          Resetovať voľby
        </button>
      </div>
    </form>
  );
}
