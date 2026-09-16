'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BulkImportRunner from './BulkImportRunner';
import ClientPagination from './ClientPagination';

type MovieItem = { id: string; title: string; slug: string; poster: string | null; year: string | null; tags: string | null; tmdbId: number | null };

export default function TagsAdminList({ initialMovies }: { initialMovies: MovieItem[] }) {
  const router = useRouter();
  const [movies, setMovies] = useState(initialMovies);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [bulkTagsPreview, setBulkTagsPreview] = useState<{ count: number; sample: string[] } | null>(null);
  const [bulkTagsBusy, setBulkTagsBusy] = useState(false);
  const [bulkTagsProgress, setBulkTagsProgress] = useState({ done: 0, total: 0 });
  const [bulkTagsDone, setBulkTagsDone] = useState<{ checked: number; batchId: string | null; results: { title: string; status: string; detail?: string }[] } | null>(null);
  const [bulkTagsUndoStatus, setBulkTagsUndoStatus] = useState<'idle' | 'undoing' | 'done'>('idle');

  async function previewBulkTags() {
    setBulkTagsBusy(true);
    setBulkTagsDone(null);
    try {
      const res = await fetch('/api/admin/movies/bulk-tags-from-tmdb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: true })
      });
      const data = await res.json();
      setBulkTagsPreview(data);
    } finally {
      setBulkTagsBusy(false);
    }
  }

  async function confirmBulkTags() {
    setBulkTagsBusy(true);
    setBulkTagsProgress({ done: 0, total: bulkTagsPreview?.count || 0 });
    try {
      const res = await fetch('/api/admin/movies/bulk-tags-from-tmdb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: false })
      });
      const data = await res.json();
      setBulkTagsDone({ checked: data.checked, batchId: data.batchId || null, results: data.results });
      setBulkTagsProgress({ done: data.checked, total: data.checked });
      setBulkTagsPreview(null);
      setBulkTagsUndoStatus('idle');

      // Zoznam filmov nižšie na stránke bol doteraz "zamrznutý" (nabral sa
      // len raz pri načítaní stránky) — bez tejto aktualizácie by síce tagy
      // boli správne uložené v databáze, ale v zozname by naďalej vyzerali
      // prázdne, čo pôsobilo, akoby sa nič nepridalo.
      const okResults: { id: string; detail?: string }[] = (data.results || []).filter((r: any) => r.status === 'OK');
      if (okResults.length > 0) {
        setMovies((prev) =>
          prev.map((m) => {
            const match = okResults.find((r) => r.id === m.id);
            return match ? { ...m, tags: match.detail || m.tags } : m;
          })
        );
      }
      router.refresh();
    } finally {
      setBulkTagsBusy(false);
    }
  }

  async function undoBulkTags() {
    if (!bulkTagsDone?.batchId) return;
    setBulkTagsUndoStatus('undoing');
    try {
      const res = await fetch('/api/admin/bulk-import/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: bulkTagsDone.batchId })
      });
      if (!res.ok) throw new Error();
      setBulkTagsUndoStatus('done');
      router.refresh();
    } catch {
      setBulkTagsUndoStatus('idle');
      alert('Vrátenie späť zlyhalo.');
    }
  }

  function tagsFor(m: MovieItem) {
    return drafts[m.id] ?? m.tags ?? '';
  }

  async function suggestFromTmdb(movieId: string) {
    setSuggesting(movieId);
    try {
      const res = await fetch(`/api/movies/${movieId}/tags/tmdb-suggest`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDrafts((prev) => ({ ...prev, [movieId]: data.tags }));
    } catch (err: any) {
      alert(err.message || 'Návrh tagov z TMDb zlyhal.');
    } finally {
      setSuggesting(null);
    }
  }

  async function save(movieId: string) {
    setSaving(movieId);
    try {
      const res = await fetch(`/api/movies/${movieId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: drafts[movieId] ?? '' })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMovies((prev) => prev.map((m) => (m.id === movieId ? { ...m, tags: data.tags } : m)));
    } catch {
      alert('Uloženie tagov zlyhalo. Skús to prosím znova.');
    } finally {
      setSaving(null);
    }
  }

  const filtered = query.trim()
    ? movies.filter((m) => m.title.toLowerCase().includes(query.trim().toLowerCase()))
    : movies;

  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <div className="border border-line rounded-xl p-4 bg-surface mb-6">
        <div className="text-sm font-semibold text-ink mb-1">Hromadne doplniť tagy z TMDb</div>
        <div className="text-xs text-muted mb-3">
          Automaticky natiahne a rovno uloží tagy z TMDb pre všetky filmy/seriály, čo ešte nemajú žiadne tagy —
          nemusíš klikať na "Automaticky z TMDb" a "Uložiť" pri každom filme zvlášť. Filmy, čo už tagy majú, sa
          nedotknú.
        </div>

        {!bulkTagsPreview && !bulkTagsDone && (
          <button
            type="button"
            onClick={previewBulkTags}
            disabled={bulkTagsBusy}
            className="border border-line text-ink text-sm font-semibold px-5 py-2.5 rounded-full hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {bulkTagsBusy ? 'Načítavam…' : 'Zobraziť náhľad'}
          </button>
        )}

        {bulkTagsPreview && !bulkTagsDone && (
          <div>
            <div className="text-xs text-ink mb-2">
              Doplní sa <strong>{bulkTagsPreview.count}</strong> filmov/seriálov. Ukážka prvých {bulkTagsPreview.sample.length}:
            </div>
            <div className="text-xs text-muted mb-3 max-h-32 overflow-y-auto">{bulkTagsPreview.sample.join(', ')}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confirmBulkTags}
                disabled={bulkTagsBusy}
                className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
              >
                {bulkTagsBusy ? 'Doplňujem…' : `Potvrdiť a doplniť (${bulkTagsPreview.count})`}
              </button>
              <button type="button" onClick={() => setBulkTagsPreview(null)} className="text-sm font-semibold text-muted hover:text-ink">
                Zrušiť
              </button>
            </div>
          </div>
        )}

        {bulkTagsBusy && bulkTagsProgress.total > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted mb-1">
              <span>Spracúvam…</span>
              <span>
                {bulkTagsProgress.done} / {bulkTagsProgress.total}
              </span>
            </div>
            <div className="h-1.5 bg-line rounded-full overflow-hidden">
              <div
                className="h-1.5 bg-accent transition-all duration-300"
                style={{ width: `${(bulkTagsProgress.done / bulkTagsProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {bulkTagsDone && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-ink">Hotovo — skontrolovaných {bulkTagsDone.checked} filmov/seriálov.</div>
              {bulkTagsDone.batchId && bulkTagsUndoStatus !== 'done' && (
                <button
                  type="button"
                  onClick={undoBulkTags}
                  disabled={bulkTagsUndoStatus === 'undoing'}
                  className="text-xs font-semibold text-danger border border-danger/40 rounded-full px-3 py-1.5 hover:bg-danger/10 disabled:opacity-50"
                >
                  {bulkTagsUndoStatus === 'undoing' ? 'Vraciam späť…' : 'Vrátiť túto dávku späť'}
                </button>
              )}
              {bulkTagsUndoStatus === 'done' && <span className="text-xs font-semibold text-emerald-600">Vrátené späť ✓</span>}
            </div>
            <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
              {bulkTagsDone.results.map((r, i) => (
                <div key={i} className={r.status === 'OK' ? 'text-ink' : 'text-danger'}>
                  <span className="font-semibold">{r.status}</span> — {r.title}
                  {r.detail ? `: ${r.detail}` : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BulkImportRunner
        endpoint="/api/admin/movies/bulk-import-tags"
        title="Hromadne pridať vlastné tagy"
        description={'Vlož zoznam v tvare "Názov filmu – tag1, tag2, tag3", jeden riadok na film. Nové tagy sa pridajú k už existujúcim, nič sa neprepíše.'}
        placeholder={'Batman – Batman, Joker, hádanka, kladivo, policie'}
        buttonLabel="Priradiť tagy"
      />

      <input
        className="field-input-sm max-w-sm mb-4"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Hľadať film/seriál…"
      />

      <div className="border border-line rounded-xl overflow-hidden">
        <div className="divide-y divide-line">
          {paged.map((m) => {
            const isDirty = drafts[m.id] !== undefined && drafts[m.id] !== (m.tags ?? '');
            return (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <div
                  className="w-9 h-12 rounded bg-surface bg-cover bg-center flex-none"
                  style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined}
                />
                <div className="w-48 flex-none">
                  <div className="text-sm font-semibold text-ink truncate">{m.title}</div>
                  {m.year && <div className="text-xs text-muted">{m.year}</div>}
                </div>
                <input
                  className="field-input-sm flex-1"
                  value={tagsFor(m)}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  placeholder="napr. Marvel, superhrdinovia, vesmír"
                />
                {m.tmdbId && (
                  <button
                    onClick={() => suggestFromTmdb(m.id)}
                    disabled={suggesting === m.id}
                    title="Navrhne preložené tagy z TMDb kľúčových slov"
                    className="text-xs font-semibold text-accent hover:underline disabled:opacity-40 flex-none"
                  >
                    {suggesting === m.id ? 'Naťahujem…' : 'Automaticky z TMDb'}
                  </button>
                )}
                <button
                  onClick={() => save(m.id)}
                  disabled={saving === m.id || !isDirty}
                  className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-40 flex-none"
                >
                  {saving === m.id ? 'Ukladám…' : 'Uložiť'}
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted p-4">Žiadny film/seriál sa nenašiel.</p>}
        </div>
      </div>
      <div className="mt-4">
        <ClientPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
