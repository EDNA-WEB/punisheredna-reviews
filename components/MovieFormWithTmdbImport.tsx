'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MovieForm from './MovieForm';

type SearchResult = { id: number; mediaType: string; title: string; originalTitle: string; year: string; poster: string | null };

export default function MovieFormWithTmdbImport({ contentType }: { contentType: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [importedData, setImportedData] = useState<any>(null);
  const [formKey, setFormKey] = useState(0);
  const [finishing, setFinishing] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/tmdb-search?query=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleImport(result: SearchResult) {
    setImporting(result.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/tmdb-details/${result.mediaType}/${result.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportedData({ ...data, contentType });
      setFormKey((k) => k + 1);
      setResults([]);
      setQuery('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(null);
    }
  }

  async function handleMovieSaved(movieId: string) {
    setFinishing(true);
    try {
      if (importedData?.trailerUrl) {
        await fetch(`/api/movies/${movieId}/videos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: importedData.trailerUrl, category: 'trailer', title: importedData.trailerTitle || null })
        });
      }
      if (importedData?.photoUrls?.length) {
        for (const photoUrl of importedData.photoUrls) {
          await fetch(`/api/movies/${movieId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full: photoUrl })
          });
        }
      }
    } catch {
      // Film je aj tak uložený — trailer/fotky sa dajú doplniť aj ručne cez Upraviť film.
    } finally {
      router.push(`/admin/movies/${movieId}/edit`);
      router.refresh();
    }
  }

  return (
    <div>
      <div className="border border-line rounded-xl p-4 mb-6 bg-surface">
        <h2 className="text-sm font-bold text-ink mb-1">Importovať z TMDb</h2>
        <p className="text-xs text-muted mb-3">
          Nájdi film/seriál a formulár nižšie sa automaticky predvyplní. Zdroj dát: TMDb — pred uložením si to prosím skontroluj.
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            className="field-input-sm flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zadaj názov filmu/seriálu…"
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50 flex-none"
          >
            {searching ? 'Hľadám…' : 'Hľadať'}
          </button>
        </form>
        {error && <p className="text-danger text-xs mt-2">{error}</p>}

        {results.length > 0 && (
          <div className="mt-3 space-y-1 max-h-72 overflow-y-auto">
            {results.map((r) => (
              <button
                key={`${r.mediaType}-${r.id}`}
                onClick={() => handleImport(r)}
                disabled={importing !== null}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-card text-left disabled:opacity-50"
              >
                <div className="w-8 h-11 rounded bg-line bg-cover bg-center flex-none" style={r.poster ? { backgroundImage: `url('${r.poster}')` } : undefined} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink truncate">{r.title} {r.year && <span className="text-muted font-normal">· {r.year}</span>}</div>
                  {r.originalTitle && r.originalTitle !== r.title && <div className="text-xs text-muted truncate">{r.originalTitle}</div>}
                </div>
                <span className="text-xs text-accent font-semibold flex-none">{importing === r.id ? 'Importujem…' : 'Použiť'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <MovieForm key={formKey} initial={importedData || { contentType }} onSuccess={handleMovieSaved} />
      {finishing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/70">
          <div className="bg-card rounded-xl px-6 py-4 text-sm text-ink">Dopĺňam trailer a fotky…</div>
        </div>
      )}
    </div>
  );
}
