'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EpisodeContentManager from './EpisodeContentManager';

type PhotoT = { id: string; thumbnail: string };
type VideoT = { id: string; url: string; title: string | null };
type EpisodeT = { id: string; number: number; title: string | null; synopsis: string | null; onlineImage: string | null; photos: PhotoT[]; videos: VideoT[] };
type SeasonT = { id: string; number: number; year: string | null; synopsis?: string | null; episodeCount: number; released: boolean; episodes: EpisodeT[]; videos: VideoT[] };
type DraftSeason = { number: number; year: string; episodeCount: string };

export default function SeasonManager({ movieId, tmdbId, initialSeasons }: { movieId: string; tmdbId?: number | null; initialSeasons: SeasonT[] }) {
  const router = useRouter();
  const [seasons, setSeasons] = useState<SeasonT[]>(initialSeasons.sort((a, b) => a.number - b.number));
  const [importingTmdb, setImportingTmdb] = useState(false);
  const [importError, setImportError] = useState('');

  async function importSeasonsFromTmdb() {
    setImportingTmdb(true);
    setImportError('');
    try {
      const res = await fetch(`/api/movies/${movieId}/seasons/import-tmdb`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import zlyhal.');
      router.refresh();
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setImportingTmdb(false);
    }
  }
  const [videoUrlFor, setVideoUrlFor] = useState<Record<string, string>>({});
  const [addingVideoFor, setAddingVideoFor] = useState<string | null>(null);

  async function addSeasonVideo(seasonId: string) {
    const url = (videoUrlFor[seasonId] || '').trim();
    if (!url) return;
    setAddingVideoFor(seasonId);
    try {
      const res = await fetch(`/api/seasons/${seasonId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (res.ok) {
        setSeasons((prev) => prev.map((s) => (s.id === seasonId ? { ...s, videos: [...s.videos, { id: data.id, url: data.url, title: data.title }] } : s)));
        setVideoUrlFor((prev) => ({ ...prev, [seasonId]: '' }));
      }
    } finally {
      setAddingVideoFor(null);
    }
  }

  async function removeSeasonVideo(seasonId: string, videoId: string) {
    setSeasons((prev) => prev.map((s) => (s.id === seasonId ? { ...s, videos: s.videos.filter((v) => v.id !== videoId) } : s)));
    await fetch(`/api/seasons/${seasonId}/videos/${videoId}`, { method: 'DELETE' }).catch(() => {});
  }
  const [howMany, setHowMany] = useState('1');
  const [drafts, setDrafts] = useState<DraftSeason[] | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [synopsisFor, setSynopsisFor] = useState<string | null>(null);
  const [synopsisDrafts, setSynopsisDrafts] = useState<Record<string, string>>({});
  const [savingSynopsis, setSavingSynopsis] = useState<string | null>(null);

  async function saveSynopsis(seasonId: string) {
    setSavingSynopsis(seasonId);
    try {
      const res = await fetch(`/api/seasons/${seasonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ synopsis: synopsisDrafts[seasonId] ?? '' })
      });
      if (!res.ok) throw new Error();
      setSeasons((prev) => prev.map((s) => (s.id === seasonId ? { ...s, synopsis: synopsisDrafts[seasonId] ?? '' } : s)));
      setSynopsisFor(null);
    } catch {
      alert('Uloženie obsahu zlyhalo. Skús to prosím znova.');
    } finally {
      setSavingSynopsis(null);
    }
  }
  const [openEpisodeFor, setOpenEpisodeFor] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function startAdding() {
    const n = Math.max(1, Math.min(50, Number(howMany) || 1));
    const nextNumber = seasons.length > 0 ? Math.max(...seasons.map((s) => s.number)) + 1 : 1;
    const currentYear = new Date().getFullYear();
    setDrafts(Array.from({ length: n }, (_, i) => ({ number: nextNumber + i, year: String(currentYear), episodeCount: '' })));
    setError('');
  }

  function updateDraft(i: number, field: keyof DraftSeason, value: string) {
    setDrafts((prev) => (prev ? prev.map((d, idx) => (idx === i ? { ...d, [field]: field === 'number' ? Number(value) : value } : d)) : prev));
  }

  async function saveDrafts() {
    if (!drafts) return;
    setSaving(true);
    setError('');
    const created: SeasonT[] = [];
    try {
      for (const d of drafts) {
        const res = await fetch(`/api/movies/${movieId}/seasons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: d.number, year: d.year, episodeCount: d.episodeCount || 0 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`Séria ${d.number}: ${data.error || 'pridanie zlyhalo.'}`);
        created.push({
          ...data,
          episodes: (data.episodes || []).map((e: any) => ({ ...e, synopsis: e.synopsis ?? null, photos: e.photos || [], videos: e.videos || [] }))
        });
      }
      setSeasons((prev) => [...prev, ...created].sort((a, b) => a.number - b.number));
      setDrafts(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeSeason(id: string) {
    setSeasons((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/movies/${movieId}/seasons/${id}`, { method: 'DELETE' }).catch(() => {});
    router.refresh();
  }

  async function toggleReleased(s: SeasonT) {
    setTogglingId(s.id);
    const next = !s.released;
    try {
      const res = await fetch(`/api/movies/${movieId}/seasons/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ released: next })
      });
      if (!res.ok) throw new Error();
      setSeasons((prev) => prev.map((x) => (x.id === s.id ? { ...x, released: next } : x)));
      router.refresh();
    } catch {
      alert('Zmena zlyhala. Skús to prosím znova.');
    } finally {
      setTogglingId(null);
    }
  }

  async function renameEpisode(seasonId: string, episodeId: string, title: string) {
    setSeasons((prev) =>
      prev.map((s) => (s.id === seasonId ? { ...s, episodes: s.episodes.map((e) => (e.id === episodeId ? { ...e, title } : e)) } : s))
    );
    await fetch(`/api/seasons/${seasonId}/episodes/${episodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    }).catch(() => {});
  }

  return (
    <div className="border border-line rounded-xl p-4 bg-surface space-y-3">
      <div className="text-xs font-bold uppercase tracking-wide text-muted">Série ({seasons.length})</div>
      <p className="text-xs text-muted -mt-2">
        Seriál sa dá hodnotiť až od poslednej (najnovšej) série označenej ako "Vydaná". Nová séria je predvolene
        nastavená bezpečne — kým ju ručne neoznačíš ako vydanú, hodnotenia zostávajú zamknuté.
      </p>

      {seasons.length > 0 && (
        <ul className="space-y-1.5">
          {seasons.map((s) => (
            <li key={s.id} className="border-b border-line pb-1.5 last:border-b-0">
              <div className="flex items-center gap-2 text-xs text-ink">
                <button
                  type="button"
                  onClick={() => toggleReleased(s)}
                  disabled={togglingId === s.id}
                  title="Klikni pre prepnutie stavu"
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-none disabled:opacity-50 ${
                    s.released ? 'text-emerald-600 border-emerald-300 hover:bg-emerald-50' : 'text-danger border-danger/40 hover:bg-danger/5'
                  }`}
                >
                  {togglingId === s.id ? '…' : s.released ? '✓ Vydaná' : 'Zamknuté — odomknúť'}
                </button>
                <span className="flex-1">
                  Séria {s.number} {s.year && `· ${s.year}`} · {s.episodes.length} epizód
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSynopsisFor((cur) => (cur === s.id ? null : s.id));
                    setSynopsisDrafts((prev) => (prev[s.id] !== undefined ? prev : { ...prev, [s.id]: s.synopsis || '' }));
                  }}
                  className="text-accent hover:underline flex-none"
                >
                  {synopsisFor === s.id ? 'Skryť obsah' : 'Upraviť obsah'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenFor((cur) => (cur === s.id ? null : s.id))}
                  className="text-accent hover:underline flex-none"
                >
                  {openFor === s.id ? 'Skryť epizódy' : 'Pomenovať epizódy'}
                </button>
                <button type="button" onClick={() => removeSeason(s.id)} className="text-muted hover:text-danger flex-none">✕</button>
              </div>

              {synopsisFor === s.id && (
                <div className="mt-2 mb-1">
                  <textarea
                    className="field-input-sm min-h-[80px] resize-y"
                    value={synopsisDrafts[s.id] ?? ''}
                    onChange={(e) => setSynopsisDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder="Krátky obsah/synopsis tejto série…"
                  />
                  <button
                    type="button"
                    onClick={() => saveSynopsis(s.id)}
                    disabled={savingSynopsis === s.id}
                    className="mt-1.5 bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
                  >
                    {savingSynopsis === s.id ? 'Ukladám…' : 'Uložiť obsah'}
                  </button>
                </div>
              )}

              <div className="mt-2 ml-1">
                {s.videos.length > 0 && (
                  <ul className="space-y-1 mb-1.5">
                    {s.videos.map((v) => (
                      <li key={v.id} className="flex items-center gap-1.5 text-[11px] text-ink">
                        <span className="text-muted">Trailer série {s.number}:</span>
                        <span className="flex-1 truncate">{v.title || v.url}</span>
                        <button type="button" onClick={() => removeSeasonVideo(s.id, v.id)} className="text-muted hover:text-danger">✕</button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center gap-1.5">
                  <input
                    className="field-input-sm flex-1"
                    value={videoUrlFor[s.id] || ''}
                    onChange={(e) => setVideoUrlFor((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder={`Trailer len k sérii ${s.number} (YouTube odkaz)…`}
                  />
                  <button
                    type="button"
                    onClick={() => addSeasonVideo(s.id)}
                    disabled={addingVideoFor === s.id}
                    className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark disabled:opacity-50 flex-none"
                  >
                    {addingVideoFor === s.id ? '…' : 'Pridať'}
                  </button>
                </div>
              </div>

              {openFor === s.id && (
                <div className="mt-2 ml-1 space-y-2">
                  {s.episodes.map((e) => (
                    <div key={e.id} className="border-b border-line pb-2 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted w-6 flex-none">{e.number}.</span>
                        <input
                          className="field-input-sm flex-1"
                          defaultValue={e.title || ''}
                          onBlur={(ev) => renameEpisode(s.id, e.id, ev.target.value)}
                          placeholder={`Názov epizódy ${e.number}…`}
                        />
                        <button
                          type="button"
                          onClick={() => setOpenEpisodeFor((cur) => (cur === e.id ? null : e.id))}
                          className="text-[11px] text-accent hover:underline flex-none whitespace-nowrap"
                        >
                          {openEpisodeFor === e.id ? 'Skryť' : 'Viac'}
                        </button>
                      </div>
                      {openEpisodeFor === e.id && (
                        <EpisodeContentManager
                          seasonId={s.id}
                          episodeId={e.id}
                          initialSynopsis={e.synopsis || ''}
                          initialPhotos={e.photos}
                          initialVideos={e.videos}
                          initialOnlineImage={e.onlineImage}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {tmdbId && !drafts && (
        <div className="border border-line rounded-lg p-3 mb-3 bg-surface">
          <button
            type="button"
            onClick={importSeasonsFromTmdb}
            disabled={importingTmdb}
            className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50"
          >
            {importingTmdb ? 'Importujem série a epizódy…' : 'Importovať všetky série a epizódy z TMDb'}
          </button>
          <p className="text-[11px] text-muted mt-1.5">
            Doplní chýbajúce série s ich epizódami (názov, obsah). Série, čo už máš pridané, sa nepreprepíšu.
          </p>
          {importError && <p className="text-danger text-xs mt-1.5">{importError}</p>}
        </div>
      )}

      {!drafts ? (
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink">Koľko sérií chceš pridať?</label>
          <input type="number" min="1" max="50" className="field-input-sm w-16" value={howMany} onChange={(e) => setHowMany(e.target.value)} />
          <button type="button" onClick={startAdding} className="text-xs font-semibold text-accent hover:underline">
            Pokračovať
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map((d, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center">
              <span className="text-xs text-ink font-semibold">Séria {d.number}</span>
              <input type="number" className="field-input-sm" value={d.year} onChange={(e) => updateDraft(i, 'year', e.target.value)} placeholder="Rok" />
              <input
                type="number"
                min="0"
                className="field-input-sm"
                value={d.episodeCount}
                onChange={(e) => updateDraft(i, 'episodeCount', e.target.value)}
                placeholder="Počet epizód"
              />
            </div>
          ))}

          {error && <div className="text-danger text-xs">{error}</div>}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={saveDrafts}
              disabled={saving}
              className="bg-accent text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
            >
              {saving ? 'Ukladám…' : 'Uložiť série'}
            </button>
            <button type="button" onClick={() => setDrafts(null)} className="text-xs text-muted hover:text-ink">
              Zrušiť
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
