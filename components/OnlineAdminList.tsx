'use client';

import { useState } from 'react';
import Link from 'next/link';

type EpisodeItem = { id: string; number: number; title: string | null; onlineImage: string | null; onlineUrl: string | null };
type SeasonItem = { id: string; number: number; episodes: EpisodeItem[] };
type MovieItem = {
  id: string;
  title: string;
  slug: string;
  poster: string | null;
  watchUrl: string | null;
  onlineImage: string | null;
  contentType: string;
  tmdbId: number | null;
  seasons: SeasonItem[];
};

function resizeToDataUrl(img: HTMLImageElement, maxWidth: number, quality: number): string {
  const scale = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.85);
}

export default function OnlineAdminList({ movies: initialMovies }: { movies: MovieItem[] }) {
  const [movies, setMovies] = useState(initialMovies);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [openEpisodesFor, setOpenEpisodesFor] = useState<string | null>(null);
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});
  const [episodeUrlDrafts, setEpisodeUrlDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');

  function urlFor(m: MovieItem) {
    return urlDrafts[m.id] ?? m.watchUrl ?? '';
  }

  async function saveUrl(m: MovieItem) {
    setSaving(m.id);
    setError('');
    try {
      const res = await fetch(`/api/movies/${m.id}/online`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchUrl: urlFor(m) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setMovies((prev) => prev.map((x) => (x.id === m.id ? { ...x, watchUrl: data.watchUrl } : x)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  async function handleAutoFromTmdb(movieId: string) {
    setUploading(movieId);
    setError('');
    try {
      const res = await fetch(`/api/movies/${movieId}/online/tmdb-image`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const saveRes = await fetch(`/api/movies/${movieId}/online`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlineImage: data.imageUrl })
      });
      if (!saveRes.ok) throw new Error();
      setMovies((prev) => prev.map((x) => (x.id === movieId ? { ...x, onlineImage: data.imageUrl } : x)));
    } catch (err: any) {
      setError(err.message || 'Automatické natiahnutie obrázka zlyhalo.');
    } finally {
      setUploading(null);
    }
  }

  function handleUpload(movieId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('Súbor je príliš veľký (max. 8 MB).');
      return;
    }
    setUploading(movieId);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        const dataUrl = resizeToDataUrl(img, 900, 0.85);
        try {
          const res = await fetch(`/api/movies/${movieId}/online`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ onlineImage: dataUrl })
          });
          if (!res.ok) throw new Error();
          setMovies((prev) => prev.map((x) => (x.id === movieId ? { ...x, onlineImage: dataUrl } : x)));
        } catch {
          alert('Nahratie náhľadového obrázka zlyhalo.');
        } finally {
          setUploading(null);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function episodeUrlFor(e: EpisodeItem) {
    return episodeUrlDrafts[e.id] ?? e.onlineUrl ?? '';
  }

  async function saveEpisodeUrl(seasonId: string, e: EpisodeItem) {
    setSaving(e.id);
    setError('');
    try {
      const res = await fetch(`/api/seasons/${seasonId}/episodes/${e.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlineUrl: episodeUrlFor(e) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      setMovies((prev) =>
        prev.map((m) => ({
          ...m,
          seasons: m.seasons.map((s) =>
            s.id === seasonId ? { ...s, episodes: s.episodes.map((ep) => (ep.id === e.id ? { ...ep, onlineUrl: episodeUrlFor(e) || null } : ep)) } : s
          )
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  async function handleEpisodeAutoFromTmdb(seasonId: string, episodeId: string) {
    setUploading(episodeId);
    setError('');
    try {
      const res = await fetch(`/api/seasons/${seasonId}/episodes/${episodeId}/tmdb-image`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const saveRes = await fetch(`/api/seasons/${seasonId}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlineImage: data.imageUrl })
      });
      if (!saveRes.ok) throw new Error();
      setMovies((prev) =>
        prev.map((m) => ({
          ...m,
          seasons: m.seasons.map((s) =>
            s.id === seasonId ? { ...s, episodes: s.episodes.map((ep) => (ep.id === episodeId ? { ...ep, onlineImage: data.imageUrl } : ep)) } : s
          )
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Automatické natiahnutie obrázka zlyhalo.');
    } finally {
      setUploading(null);
    }
  }

  function handleEpisodeUpload(seasonId: string, episodeId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('Súbor je príliš veľký (max. 8 MB).');
      return;
    }
    setUploading(episodeId);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        const dataUrl = resizeToDataUrl(img, 900, 0.85);
        try {
          const res = await fetch(`/api/seasons/${seasonId}/episodes/${episodeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ onlineImage: dataUrl })
          });
          if (!res.ok) throw new Error();
          setMovies((prev) =>
            prev.map((m) => ({
              ...m,
              seasons: m.seasons.map((s) =>
                s.id === seasonId ? { ...s, episodes: s.episodes.map((ep) => (ep.id === episodeId ? { ...ep, onlineImage: dataUrl } : ep)) } : s
              )
            }))
          );
        } catch {
          alert('Nahratie náhľadového obrázka zlyhalo.');
        } finally {
          setUploading(null);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="space-y-2 max-w-2xl">
      {movies.map((m) => (
        <div key={m.id} className="border border-line rounded-xl overflow-hidden bg-card">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-10 h-14 rounded-md bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
            <Link href={`/movie/${m.slug}`} target="_blank" className="text-sm font-semibold text-ink hover:text-accent flex-1 truncate flex items-center gap-1.5">
              {(m.contentType === 'Seriál' ? !m.seasons.some((s) => s.episodes.some((ep) => ep.onlineUrl)) : !m.watchUrl) && (
                <span className="w-2 h-2 rounded-full bg-danger flex-none animate-pulse" title="Chýba online odkaz" />
              )}
              {m.title}
            </Link>
            {m.watchUrl && (
              <span className="text-[11px] font-semibold text-emerald-600 flex-none whitespace-nowrap">✓ nastavené</span>
            )}
            <button
              type="button"
              onClick={() => setOpenFor((cur) => (cur === m.id ? null : m.id))}
              className="text-xs font-semibold text-accent hover:underline flex-none whitespace-nowrap"
            >
              {openFor === m.id ? 'Skryť' : 'Nastaviť Online'}
            </button>
          </div>

          {openFor === m.id && (
            <div className="p-3.5 pt-0 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  {m.contentType === 'Seriál' ? 'Základný odkaz (použije sa, ak epizóda nemá vlastný)' : 'Odkaz na sledovanie (kam sa diváci presmerujú)'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    className="field-input-sm flex-1"
                    value={urlFor(m)}
                    onChange={(e) => setUrlDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder="https://…"
                  />
                  <button
                    type="button"
                    onClick={() => saveUrl(m)}
                    disabled={saving === m.id}
                    className="bg-accent text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-accent-dark disabled:opacity-50 flex-none"
                  >
                    {saving === m.id ? '…' : 'Uložiť'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  {m.contentType === 'Seriál' ? 'Základný náhľadový obrázok' : 'Náhľadový obrázok'}
                </label>
                <label htmlFor={`online-img-${m.id}`} className="block cursor-pointer w-fit">
                  {m.onlineImage ? (
                    <img src={m.onlineImage} alt="" className="w-48 h-28 object-cover rounded-lg bg-surface" />
                  ) : (
                    <div className="w-48 h-28 rounded-lg bg-surface border border-dashed border-line flex items-center justify-center text-xs text-muted text-center px-2">
                      {uploading === m.id ? 'Nahrávam…' : 'Klikni pre nahratie'}
                    </div>
                  )}
                </label>
                <input id={`online-img-${m.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(m.id, e)} />
                {m.tmdbId && (
                  <button
                    type="button"
                    onClick={() => handleAutoFromTmdb(m.id)}
                    disabled={uploading === m.id}
                    className="mt-1.5 text-xs font-semibold text-accent hover:underline disabled:opacity-50"
                  >
                    {uploading === m.id ? 'Naťahujem…' : 'Automaticky z TMDb'}
                  </button>
                )}
              </div>

              {m.contentType === 'Seriál' && m.seasons.length > 0 && (
                <div className="pt-1 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setOpenEpisodesFor((cur) => (cur === m.id ? null : m.id))}
                    className="text-xs font-semibold text-accent hover:underline mt-3"
                  >
                    {openEpisodesFor === m.id ? 'Skryť epizódy' : 'Nastaviť pre jednotlivé epizódy ▾'}
                  </button>

                  {openEpisodesFor === m.id && (
                    <div className="mt-3 space-y-4">
                      {m.seasons.map((s) => (
                        <div key={s.id}>
                          <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">Séria {s.number}</div>
                          <div className="space-y-2.5">
                            {s.episodes.map((ep) => (
                              <div key={ep.id} className="flex items-center gap-2.5 border border-line rounded-lg p-2">
                                <label htmlFor={`ep-online-img-${ep.id}`} className="cursor-pointer flex-none">
                                  {ep.onlineImage ? (
                                    <img src={ep.onlineImage} alt="" className="w-16 h-9 object-cover rounded bg-surface" />
                                  ) : (
                                    <div className="w-16 h-9 rounded bg-surface border border-dashed border-line flex items-center justify-center text-[9px] text-muted text-center">
                                      {uploading === ep.id ? '…' : 'Foto'}
                                    </div>
                                  )}
                                </label>
                                <input
                                  id={`ep-online-img-${ep.id}`}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleEpisodeUpload(s.id, ep.id, e)}
                                />
                                {m.tmdbId && (
                                  <button
                                    type="button"
                                    onClick={() => handleEpisodeAutoFromTmdb(s.id, ep.id)}
                                    disabled={uploading === ep.id}
                                    title="Automaticky z TMDb"
                                    className="flex-none text-[10px] font-semibold text-accent hover:underline disabled:opacity-50"
                                  >
                                    Auto TMDb
                                  </button>
                                )}
                                <span className="text-[11px] text-ink font-semibold w-8 flex-none">E{String(ep.number).padStart(2, '0')}</span>
                                <span className="text-xs text-muted flex-1 truncate">{ep.title || `Epizóda ${ep.number}`}</span>
                                <input
                                  className="field-input-sm flex-1"
                                  value={episodeUrlFor(ep)}
                                  onChange={(e) => setEpisodeUrlDrafts((prev) => ({ ...prev, [ep.id]: e.target.value }))}
                                  placeholder="Vlastný odkaz (nepovinné)…"
                                />
                                <button
                                  type="button"
                                  onClick={() => saveEpisodeUrl(s.id, ep)}
                                  disabled={saving === ep.id}
                                  className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark disabled:opacity-50 flex-none"
                                >
                                  {saving === ep.id ? '…' : 'Uložiť'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && <div className="text-danger text-xs">{error}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
