'use client';

import { useState } from 'react';

type LinkType = { id: string; name: string; icon: string | null; color: string | null; order: number };
type MovieItem = {
  id: string;
  title: string;
  slug: string;
  poster: string | null;
  year: string | null;
  links: { linkTypeId: string; url: string }[];
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

export default function MovieLinksAdmin({
  initialLinkTypes,
  initialMovies
}: {
  initialLinkTypes: LinkType[];
  initialMovies: MovieItem[];
}) {
  const [linkTypes, setLinkTypes] = useState(initialLinkTypes);
  const [movies, setMovies] = useState(initialMovies);

  // --- Katalóg typov odkazov ---
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newColor, setNewColor] = useState('#000000');
  const [addingType, setAddingType] = useState(false);
  const [typeError, setTypeError] = useState('');

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

  async function addLinkType(e: React.FormEvent) {
    e.preventDefault();
    setTypeError('');
    if (!newName.trim()) {
      setTypeError('Zadaj názov typu odkazu.');
      return;
    }
    setAddingType(true);
    try {
      const res = await fetch('/api/admin/link-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), icon: newIcon || null, color: newColor })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pridanie zlyhalo.');
      setLinkTypes((prev) => [...prev, data]);
      setNewName('');
      setNewIcon('');
      setNewColor('#000000');
    } catch (err: any) {
      setTypeError(err.message);
    } finally {
      setAddingType(false);
    }
  }

  async function deleteLinkType(id: string) {
    if (!confirm('Naozaj zmazať tento typ odkazu z katalógu? Zmizne aj zo všetkých filmov, čo ho majú priradený.')) return;
    const res = await fetch(`/api/admin/link-types/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setLinkTypes((prev) => prev.filter((s) => s.id !== id));
      setMovies((prev) => prev.map((m) => ({ ...m, links: m.links.filter((l) => l.linkTypeId !== id) })));
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
      const checked = new Set(m.links.map((l) => l.linkTypeId));
      const urls: Record<string, string> = {};
      m.links.forEach((l) => (urls[l.linkTypeId] = l.url));
      setDrafts((prev) => ({ ...prev, [m.id]: { checked, urls } }));
    }
  }

  function toggleType(movieId: string, linkTypeId: string) {
    setDrafts((prev) => {
      const d = prev[movieId] || { checked: new Set<string>(), urls: {} };
      const checked = new Set(d.checked);
      if (checked.has(linkTypeId)) checked.delete(linkTypeId);
      else checked.add(linkTypeId);
      return { ...prev, [movieId]: { ...d, checked } };
    });
  }

  function setUrl(movieId: string, linkTypeId: string, url: string) {
    setDrafts((prev) => {
      const d = prev[movieId] || { checked: new Set<string>(), urls: {} };
      return { ...prev, [movieId]: { ...d, urls: { ...d.urls, [linkTypeId]: url } } };
    });
  }

  async function saveMovie(movieId: string) {
    const d = drafts[movieId];
    if (!d) return;
    setSaveError('');
    const payload = Array.from(d.checked).map((linkTypeId) => ({ linkTypeId, url: (d.urls[linkTypeId] || '').trim() }));
    if (payload.some((p) => !p.url)) {
      setSaveError('Každý zaškrtnutý typ odkazu musí mať vyplnenú URL.');
      return;
    }
    setSaving(movieId);
    try {
      const res = await fetch(`/api/movies/${movieId}/links`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: payload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setMovies((prev) => prev.map((m) => (m.id === movieId ? { ...m, links: payload.map((p) => ({ linkTypeId: p.linkTypeId, url: p.url })) } : m)));
      setOpenFor(null);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Katalóg typov odkazov */}
      <div className="border border-line rounded-xl p-4">
        <h2 className="text-sm font-bold text-ink mb-3">Katalóg typov odkazov</h2>

        {linkTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {linkTypes.map((lt) => (
              <div key={lt.id} className="flex items-center gap-2 border border-line rounded-full pl-1.5 pr-3 py-1.5">
                {lt.icon ? (
                  <span className="w-6 h-6 rounded-full flex-none flex items-center justify-center overflow-hidden" style={{ backgroundColor: lt.color || '#f3f3f3' }}>
                    <img src={lt.icon} alt="" className="w-full h-full object-cover" />
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full flex-none" style={{ backgroundColor: lt.color || '#ccc' }} />
                )}
                <span className="text-sm font-semibold text-ink">{lt.name}</span>
                <button onClick={() => deleteLinkType(lt.id)} className="text-muted hover:text-danger text-xs ml-1">✕</button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={addLinkType} className="flex items-center gap-2 flex-wrap">
          <label className="w-9 h-9 rounded-full border border-line flex items-center justify-center cursor-pointer hover:border-accent flex-none overflow-hidden">
            {newIcon ? <img src={newIcon} alt="" className="w-full h-full object-cover" /> : <span className="text-muted text-xs">＋</span>}
            <input type="file" accept="image/*" className="hidden" onChange={handleIconFile} />
          </label>
          <input
            className="field-input-sm flex-1 min-w-[160px]"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Názov typu odkazu (napr. Facebook, ČSFD, IMDb)"
          />
          <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-9 h-9 rounded-full border border-line cursor-pointer flex-none" title="Farba (ak nemá ikonku)" />
          <button
            type="submit"
            disabled={addingType}
            className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50 flex-none"
          >
            {addingType ? 'Pridávam…' : 'Pridať'}
          </button>
        </form>
        {typeError && <p className="text-danger text-xs mt-2">{typeError}</p>}
      </div>

      {/* Priradenie k filmom */}
      <div>
        <h2 className="text-sm font-bold text-ink mb-3">Priradiť filmom odkazy</h2>
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
                    <div className="text-xs text-muted">{m.links.length > 0 ? `${m.links.length} odkazov priradených` : 'Zatiaľ žiadne odkazy'}</div>
                  </div>
                  <span className="text-muted text-xs flex-none">{openFor === m.id ? '▲' : '▼'}</span>
                </button>

                {openFor === m.id && draft && (
                  <div className="p-4 bg-surface border-t border-line space-y-3">
                    {linkTypes.length === 0 && <p className="text-xs text-muted">Najprv pridaj aspoň jeden typ odkazu do katalógu vyššie.</p>}
                    {linkTypes.map((lt) => (
                      <div key={lt.id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={draft.checked.has(lt.id)}
                          onChange={() => toggleType(m.id, lt.id)}
                          className="w-4 h-4 flex-none"
                        />
                        {lt.icon ? (
                          <span className="w-6 h-6 rounded-full flex-none flex items-center justify-center overflow-hidden" style={{ backgroundColor: lt.color || '#f3f3f3' }}>
                            <img src={lt.icon} alt="" className="w-full h-full object-cover" />
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-full flex-none" style={{ backgroundColor: lt.color || '#ccc' }} />
                        )}
                        <span className="text-sm font-medium text-ink w-24 flex-none truncate">{lt.name}</span>
                        <input
                          type="text"
                          disabled={!draft.checked.has(lt.id)}
                          value={draft.urls[lt.id] || ''}
                          onChange={(e) => setUrl(m.id, lt.id, e.target.value)}
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
