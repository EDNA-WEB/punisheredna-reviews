'use client';

import { useState } from 'react';
import PersonForm from './PersonForm';

type SearchResult = { id: number; name: string; knownForDepartment: string; photo: string | null; knownFor: string };

export default function PersonFormWithTmdbImport() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [importedData, setImportedData] = useState<any>(null);
  const [formKey, setFormKey] = useState(0);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/tmdb-search-person?query=${encodeURIComponent(query.trim())}`);
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
      const res = await fetch(`/api/admin/tmdb-person-details/${result.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportedData(data);
      setFormKey((k) => k + 1);
      setResults([]);
      setQuery('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(null);
    }
  }

  return (
    <div>
      <div className="border border-line rounded-xl p-4 mb-6 bg-surface">
        <h2 className="text-sm font-bold text-ink mb-1">Importovať z TMDb</h2>
        <p className="text-xs text-muted mb-3">
          Nájdi herca/tvorcu a formulár nižšie sa automaticky predvyplní. Zdroj dát: TMDb — pred uložením si to prosím skontroluj (napr. rolu Herec/Tvorca).
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            className="field-input-sm flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zadaj meno herca/tvorcu…"
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
                key={r.id}
                onClick={() => handleImport(r)}
                disabled={importing !== null}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-card text-left disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full bg-line bg-cover bg-center flex-none" style={r.photo ? { backgroundImage: `url('${r.photo}')` } : undefined} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink truncate">{r.name}</div>
                  {r.knownFor && <div className="text-xs text-muted truncate">{r.knownFor}</div>}
                </div>
                <span className="text-xs text-accent font-semibold flex-none">{importing === r.id ? 'Importujem…' : 'Použiť'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <PersonForm key={formKey} initial={importedData || undefined} />
    </div>
  );
}
