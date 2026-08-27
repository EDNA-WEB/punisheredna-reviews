'use client';

import { useState } from 'react';
import { PERSON_TYPES } from '@/lib/filterConstants';
import { useRouter } from 'next/navigation';

type Initial = {
  id?: string;
  name?: string;
  role?: string;
  photo?: string | null;
  bio?: string | null;
  birthDate?: string | Date | null;
  deathDate?: string | Date | null;
  birthPlace?: string | null;
  deathPlace?: string | null;
  subRole?: string | null;
};

export default function PersonForm({ initial, redirectTo }: { initial?: Initial; redirectTo?: string }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [name, setName] = useState(initial?.name || '');
  const [role, setRole] = useState(initial?.role || 'ACTOR');
  const [photo, setPhoto] = useState(initial?.photo || '');
  const [bio, setBio] = useState(initial?.bio || '');
  const [birthDate, setBirthDate] = useState(initial?.birthDate ? new Date(initial.birthDate).toISOString().slice(0, 10) : '');
  const [deathDate, setDeathDate] = useState(initial?.deathDate ? new Date(initial.deathDate).toISOString().slice(0, 10) : '');
  const [birthPlace, setBirthPlace] = useState(initial?.birthPlace || '');
  const [deathPlace, setDeathPlace] = useState(initial?.deathPlace || '');
  const [subRole, setSubRole] = useState(initial?.subRole || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 500;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Zadaj meno.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(isEdit ? `/api/people/${initial!.id}` : '/api/people', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, subRole: subRole || null, photo, bio, birthDate: birthDate || null, deathDate: deathDate || null, birthPlace: birthPlace || null, deathPlace: deathPlace || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      router.push(redirectTo || '/admin/people');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Fotka</label>
        <label
          htmlFor="person-photo"
          className="block border-2 border-dashed border-line rounded-xl p-5 text-center text-muted text-sm cursor-pointer bg-cover bg-center min-h-[140px] flex items-center justify-center"
          style={photo ? { backgroundImage: `url('${photo}')`, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)', backgroundColor: 'rgba(0,0,0,0.25)', backgroundBlendMode: 'darken' } : undefined}
        >
          {photo ? 'Klikni pre zmenu fotky' : 'Klikni a vyber fotku'}
        </label>
        <input id="person-photo" type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Meno</label>
        <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="napr. Matt Damon" />
        <p className="text-xs text-muted mt-1.5">
          Meno musí presne sedieť s tým, ako je napísané v obsadení/réžii filmov, aby sa dalo prepojiť.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Skupina</label>
        <select className="field-input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="ACTOR">Herci</option>
          <option value="CREATOR">Tvorcovia</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Konkrétny typ (nepovinné)</label>
        <select className="field-input" value={subRole} onChange={(e) => setSubRole(e.target.value)}>
          <option value="">— Nešpecifikované —</option>
          {PERSON_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Dátum narodenia</label>
          <input type="date" className="field-input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Dátum úmrtia</label>
          <input type="date" className="field-input" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
          <p className="text-xs text-muted mt-1.5">Ak osoba žije, nechaj prázdne.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Miesto narodenia</label>
          <input className="field-input" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} placeholder="napr. Cambridge, USA" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Miesto úmrtia</label>
          <input className="field-input" value={deathPlace} onChange={(e) => setDeathPlace(e.target.value)} placeholder="Ak osoba žije, nechaj prázdne" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">O osobe (nepovinné)</label>
        <textarea className="field-input min-h-[120px]" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Krátky životopis…" />
      </div>

      {error && <div className="text-danger text-sm">{error}</div>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
          {loading ? 'Ukladám…' : isEdit ? 'Uložiť zmeny' : 'Pridať osobu'}
        </button>
        <button type="button" onClick={() => router.back()} className="border border-line text-muted px-6 py-3 rounded-full text-sm font-semibold hover:text-ink hover:border-ink">
          Zrušiť
        </button>
      </div>
    </form>
  );
}
