'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n'; // uprav podľa skutočného hooku vo vašom projekte (viď translationRegistry poznámka nižšie)

type RowResult = {
  row: number;
  title: string;
  year: number | null;
  status: 'updated' | 'not_found' | 'error';
  message?: string;
};

export default function ImportPage() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('admin.import.genericError'));
      setResults(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const updatedCount = results?.filter((r) => r.status === 'updated').length ?? 0;
  const notFoundCount = results?.filter((r) => r.status === 'not_found').length ?? 0;
  const errorCount = results?.filter((r) => r.status === 'error').length ?? 0;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-display text-ink mb-2">{t('admin.import.title')}</h1>
      <p className="text-muted mb-6">{t('admin.import.description')}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-8">
        <input
          type="file"
          accept=".json,.csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-ink"
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="bg-accent hover:bg-accent-dark text-white rounded px-4 py-2 disabled:opacity-50 w-fit"
        >
          {loading ? t('admin.import.processing') : t('admin.import.submit')}
        </button>
      </form>

      {error && <p className="text-danger mb-4">{error}</p>}

      {results && (
        <div>
          <p className="mb-4 text-ink">
            {t('admin.import.summary')
              .replace('{updated}', String(updatedCount))
              .replace('{notFound}', String(notFoundCount))
              .replace('{errors}', String(errorCount))}
          </p>
          <table className="w-full text-sm border border-line">
            <thead>
              <tr className="bg-surface2">
                <th className="p-2 text-left">{t('admin.import.colRow')}</th>
                <th className="p-2 text-left">{t('admin.import.colTitle')}</th>
                <th className="p-2 text-left">{t('admin.import.colYear')}</th>
                <th className="p-2 text-left">{t('admin.import.colStatus')}</th>
                <th className="p-2 text-left">{t('admin.import.colMessage')}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.row} className="border-t border-line">
                  <td className="p-2">{r.row}</td>
                  <td className="p-2">{r.title}</td>
                  <td className="p-2">{r.year}</td>
                  <td className="p-2">
                    {r.status === 'updated' && (
                      <span className="text-green-600">{t('admin.import.statusUpdated')}</span>
                    )}
                    {r.status === 'not_found' && (
                      <span className="text-yellow-600">{t('admin.import.statusNotFound')}</span>
                    )}
                    {r.status === 'error' && (
                      <span className="text-danger">{t('admin.import.statusError')}</span>
                    )}
                  </td>
                  <td className="p-2">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
