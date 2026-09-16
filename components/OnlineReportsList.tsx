'use client';

import { useState } from 'react';
import Link from 'next/link';

type ReportItem = {
  id: string;
  movieTitle: string;
  movieSlug: string;
  reporterName: string | null;
  note: string | null;
  createdAt: string;
};

export default function OnlineReportsList({ initialReports }: { initialReports: ReportItem[] }) {
  const [reports, setReports] = useState(initialReports);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function resolve(id: string) {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/admin/online-reports/${id}/resolve`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('Označenie ako vyriešené zlyhalo. Skús to prosím znova.');
    } finally {
      setResolvingId(null);
    }
  }

  if (reports.length === 0) return null;

  return (
    <div className="border border-danger/40 bg-danger/5 rounded-xl p-4 mb-6">
      <div className="text-sm font-bold text-ink mb-3">
        📣 Nevyriešené nahlásenia od divákov ({reports.length})
      </div>
      <div className="space-y-2">
        {reports.map((r) => (
          <div key={r.id} className="bg-card border border-line rounded-lg p-3 flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Link href={`/movie/${r.movieSlug}`} className="font-semibold text-accent hover:underline text-sm">
                {r.movieTitle}
              </Link>
              {r.note && <p className="text-xs text-ink mt-1">„{r.note}"</p>}
              <p className="text-[11px] text-muted mt-1">
                {r.reporterName ? `Nahlásil: ${r.reporterName}` : 'Anonymne'} · {new Date(r.createdAt).toLocaleDateString('sk-SK')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => resolve(r.id)}
              disabled={resolvingId === r.id}
              className="text-xs font-semibold text-emerald-600 border border-emerald-600/40 rounded-full px-3 py-1.5 hover:bg-emerald-50 disabled:opacity-50 flex-none"
            >
              {resolvingId === r.id ? 'Označujem…' : 'Vyriešené'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
