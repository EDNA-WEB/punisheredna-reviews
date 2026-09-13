'use client';

import { useState } from 'react';

export default function MovieExportForm() {
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [contentType, setContentType] = useState('');
  const [approvedOnly, setApprovedOnly] = useState(true);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (yearFrom) params.set('yearFrom', yearFrom);
      if (yearTo) params.set('yearTo', yearTo);
      if (contentType) params.set('contentType', contentType);
      params.set('approvedOnly', String(approvedOnly));

      const res = await fetch(`/api/admin/movies/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export zlyhal.');

      // Súbor príde priamo v tele odpovede (CSV) — vytvoríme z neho dočasný
      // odkaz na stiahnutie a hneď ho "klikneme", nič sa nezobrazuje v okne.
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filmy-a-serialy-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export zlyhal. Skús to prosím znova.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="bg-card border border-line rounded-xl p-6 max-w-xl">
      <p className="text-sm text-muted mb-6">
        Vygeneruje zoznam filmov a seriálov vo formáte CSV (otvárateľné v Exceli), s možnosťou obmedziť
        výsledok na konkrétny rozsah rokov alebo typ obsahu.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">Rok od</label>
          <input
            type="number"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            placeholder="napr. 1990"
            className="w-full border border-line rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">Rok do</label>
          <input
            type="number"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
            placeholder="napr. 2026"
            className="w-full border border-line rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-ink mb-1.5">Typ obsahu</label>
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Všetko (filmy aj seriály)</option>
          <option value="Film">Len filmy</option>
          <option value="Seriál">Len seriály</option>
          <option value="TV film">Len TV filmy</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink mb-6 cursor-pointer">
        <input type="checkbox" checked={approvedOnly} onChange={(e) => setApprovedOnly(e.target.checked)} />
        Len schválené záznamy
      </label>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
      >
        {downloading ? 'Pripravujem…' : 'Stiahnuť zoznam (CSV)'}
      </button>
    </div>
  );
}
