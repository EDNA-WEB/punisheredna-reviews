'use client';

import { useState } from 'react';

type Service = { id: string; name: string; icon: string | null; color: string | null; order: number };
type MovieItem = {
  id: string;
  title: string;
  slug: string;
  poster: string | null;
  year: string | null;
  streamingServices: { streamingServiceId: string; url: string }[];
};

function resizeToDataUrl(img: HTMLImageElement, maxWidth: number, quality: number): string {
  const scale = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.9);
}

export default function StreamingServicesAdmin({
  initialServices,
  initialMovies
}: {
  initialServices: Service[];
  initialMovies: MovieItem[];
}) {
  const [services, setServices] = useState(initialServices);
  const [movies, setMovies] = useState(initialMovies);

  // --- Katalóg služieb ---
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newColor, setNewColor] = useState('#000000');
  const [addingService, setAddingService] = useState(false);
  const [serviceError, setServiceError] = useState('');

  function handleIconFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement('img');
      img.onload = () => setNewIcon(resizeToDataUrl(img, 200, 0.9));
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    setServiceError('');
    if (!newName.trim()) {
      setServiceError('Zadaj názov služby.');
      return;
    }
    setAddingService(true);
    try {
      const res = await fetch('/api/admin/streaming-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), icon: newIcon || null, color: newColor })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pridanie zlyhalo.');
      setServices((prev) => [...prev, data]);
      setNewName('');
      setNewIcon('');
      setNewColor('#000000');
    } catch (err: any) {
      setServiceError(err.message);
    } finally {
      setAddingService(false);
    }
  }

  async function deleteService(id: string) {
    if (!confirm('Naozaj zmazať túto službu z katalógu? Zmizne aj zo všetkých filmov, čo ju majú priradenú.')) return;
    const res = await fetch(`/api/admin/streaming-services/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setServices((prev) => prev.filter((s) => s.id !== id));
      setMovies((prev) => prev.map((m) => ({ ...m, streamingServices: m.streamingServices.filter((s) => s.streamingServiceId !== id) })));
    }
  }

  // --- Priradenie k filmom ---
  const [search, setSearch] = useState('');
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { checked: Set<string>; urls: Record<string, string> }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  const filteredMovies = movies.filter((m) => m.title.toLowerCase().includes(search.toLowerCase()));

  function openMovie(m: MovieItem) {
    if (openFor === m.id) {
      setOpenFor(null);
      return;
    }
    setOpenFor(m.id);
    if (!drafts[m.id]) {
      const checked = new Set(m.streamingServices.map((s) => s.streamingServiceId));
      const urls: Record<string, string> = {};
      m.streamingServices.forEach((s) => (urls[s.streamingServiceId] = s.url));
      setDrafts((prev) => ({ ...prev, [m.id]: { checked, urls } }));
    }
  }

  function toggleService(movieId: string, serviceId: string) {
    setDrafts((prev) => {
      const d = prev[movieId] || { checked: new Set<string>(), urls: {} };
      const checked = new Set(d.checked);
      if (checked.has(serviceId)) checked.delete(serviceId);
      else checked.add(serviceId);
      return { ...prev, [movieId]: { ...d, checked } };
    });
  }

  function setUrl(movieId: string, serviceId: string, url: string) {
    setDrafts((prev) => {
      const d = prev[movieId] || { checked: new Set<string>(), urls: {} };
      return { ...prev, [movieId]: { ...d, urls: { ...d.urls, [serviceId]: url } } };
    });
  }

  async function saveMovie(movieId: string) {
    const d = drafts[movieId];
    if (!d) return;
    setSaveError('');
    const payload = Array.from(d.checked).map((serviceId) => ({ streamingServiceId: serviceId, url: (d.urls[serviceId] || '').trim() }));
    if (payload.some((p) => !p.url)) {
      setSaveError('Každá zaškrtnutá služba musí mať vyplnený odkaz.');
      return;
    }
    setSaving(movieId);
    try {
      const res = await fetch(`/api/movies/${movieId}/streaming`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: payload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setMovies((prev) => prev.map((m) => (m.id === movieId ? { ...m, streamingServices: payload.map((p) => ({ streamingServiceId: p.streamingServiceId, url: p.url })) } : m)));
      setOpenFor(null);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Katalóg služieb */}
      <div className="border border-line rounded-xl p-4">
        <h2 className="text-sm font-bold text-ink mb-3">Katalóg streamovacích služieb</h2>

        {services.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {services.map((s) => (
              <div key={s.id} className="flex items-center gap-2 border border-line rounded-full pl-1.5 pr-3 py-1.5">
                {s.icon ? (
                  <span className="w-6 h-6 rounded-full flex-none flex items-center justify-center overflow-hidden" style={{ backgroundColor: s.color || '#f3f3f3' }}>
                          <img src={s.icon} alt="" className="w-full h-full object-contain p-0.5" />
                        </span>
                ) : (
                  <span className="w-6 h-6 rounded-full flex-none" style={{ backgroundColor: s.color || '#ccc' }} />
                )}
                <span className="text-sm font-semibold text-ink">{s.name}</span>
                <button onClick={() => deleteService(s.id)} className="text-muted hover:text-danger text-xs ml-1">✕</button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={addService} className="flex items-center gap-2 flex-wrap">
          <label className="w-9 h-9 rounded-full border border-line flex items-center justify-center cursor-pointer hover:border-accent flex-none overflow-hidden">
            {newIcon ? <img src={newIcon} alt="" className="w-full h-full object-cover" /> : <span className="text-muted text-xs">＋</span>}
            <input type="file" accept="image/*" className="hidden" onChange={handleIconFile} />
          </label>
          <input
            className="field-input-sm flex-1 min-w-[160px]"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Názov služby (napr. HBO Max)"
          />
          <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-9 h-9 rounded-full border border-line cursor-pointer flex-none" title="Farba (ak nemá ikonku)" />
          <button
            type="submit"
            disabled={addingService}
            className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50 flex-none"
          >
            {addingService ? 'Pridávam…' : 'Pridať'}
          </button>
        </form>
        {serviceError && <p className="text-danger text-xs mt-2">{serviceError}</p>}
      </div>

      {/* Priradenie k filmom */}
      <div>
        <h2 className="text-sm font-bold text-ink mb-3">Priradiť službám filmy</h2>
        <input
          className="field-input mb-4"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hľadať film…"
        />

        {saveError && <p className="text-danger text-xs mb-3">{saveError}</p>}

        <div className="border border-line rounded-xl overflow-hidden divide-y divide-line">
          {filteredMovies.slice(0, 50).map((m) => {
            const draft = drafts[m.id];
            return (
              <div key={m.id}>
                <button onClick={() => openMovie(m)} className="w-full flex items-center gap-3 p-3 hover:bg-surface text-left">
                  <div className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{m.title} {m.year && <span className="text-muted font-normal">· {m.year}</span>}</div>
                    <div className="text-xs text-muted">{m.streamingServices.length > 0 ? `${m.streamingServices.length} služieb priradených` : 'Zatiaľ žiadne služby'}</div>
                  </div>
                  <span className="text-muted text-xs flex-none">{openFor === m.id ? '▲' : '▼'}</span>
                </button>

                {openFor === m.id && draft && (
                  <div className="p-4 bg-surface border-t border-line space-y-3">
                    {services.length === 0 && <p className="text-xs text-muted">Najprv pridaj aspoň jednu službu do katalógu vyššie.</p>}
                    {services.map((s) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={draft.checked.has(s.id)}
                          onChange={() => toggleService(m.id, s.id)}
                          className="w-4 h-4 flex-none"
                        />
                        {s.icon ? (
                          <span className="w-6 h-6 rounded-full flex-none flex items-center justify-center overflow-hidden" style={{ backgroundColor: s.color || '#f3f3f3' }}>
                          <img src={s.icon} alt="" className="w-full h-full object-contain p-0.5" />
                        </span>
                        ) : (
                          <span className="w-6 h-6 rounded-full flex-none" style={{ backgroundColor: s.color || '#ccc' }} />
                        )}
                        <span className="text-sm font-medium text-ink w-24 flex-none truncate">{s.name}</span>
                        <input
                          type="text"
                          disabled={!draft.checked.has(s.id)}
                          value={draft.urls[s.id] || ''}
                          onChange={(e) => setUrl(m.id, s.id, e.target.value)}
                          placeholder="https://…"
                          className="field-input-sm flex-1 disabled:opacity-40"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => saveMovie(m.id)}
                      disabled={saving === m.id}
                      className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50"
                    >
                      {saving === m.id ? 'Ukladám…' : 'Uložiť'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {filteredMovies.length > 50 && (
          <p className="text-xs text-muted mt-2">Zobrazených prvých 50 výsledkov — hľadaj presnejšie, ak nevidíš svoj film.</p>
        )}
      </div>
    </div>
  );
}
