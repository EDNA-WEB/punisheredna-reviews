'use client';

import { useState } from 'react';
import Link from 'next/link';

type Submission = {
  id: string;
  body: string;
  createdAt: string | Date;
  movie: { title: string; slug: string; poster: string | null; year: string | null };
  author: { name: string | null; id: string };
};

export default function ContentSubmissionsAdmin({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);

  async function act(id: string, action: 'approve' | 'reject') {
    setWorking(id);
    try {
      const res = await fetch(`/api/admin/content-submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, editedBody: drafts[id] })
      });
      if (!res.ok) throw new Error();
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert('Akcia zlyhala. Skús to prosím znova.');
    } finally {
      setWorking(null);
    }
  }

  if (submissions.length === 0) {
    return <p className="text-sm text-muted">Žiadne návrhy nečakajú na schválenie.</p>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      {submissions.map((s) => (
        <div key={s.id} className="border border-line rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none" style={s.movie.poster ? { backgroundImage: `url('${s.movie.poster}')` } : undefined} />
            <div className="min-w-0">
              <Link href={`/movie/${s.movie.slug}`} className="text-sm font-semibold text-ink hover:text-accent truncate block">
                {s.movie.title} {s.movie.year && <span className="text-muted font-normal">· {s.movie.year}</span>}
              </Link>
              <div className="text-xs text-muted">
                Od: <Link href={`/profile/${s.author.id}`} className="text-accent hover:underline">{s.author.name}</Link>
                {' · '}{new Date(s.createdAt).toLocaleDateString('sk-SK')}
              </div>
            </div>
          </div>
          <textarea
            defaultValue={s.body}
            onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
            rows={5}
            className="field-input mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => act(s.id, 'approve')}
              disabled={working === s.id}
              className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark disabled:opacity-50"
            >
              Schváliť a uložiť
            </button>
            <button
              onClick={() => act(s.id, 'reject')}
              disabled={working === s.id}
              className="border border-line text-ink text-xs font-semibold px-4 py-2 rounded-full hover:bg-surface disabled:opacity-50"
            >
              Zamietnuť
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
