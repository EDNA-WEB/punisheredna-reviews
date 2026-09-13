'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconLink } from './Icons';

type Movie = { slug: string; title: string; poster: string | null; year: string | null };

export default function MovieListCard({ id, title, itemCount, items }: { id: string; title: string; itemCount: number; items: Movie[] }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = `${window.location.origin}/zoznam/${id}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="flex items-center justify-between bg-surface px-4 py-2.5 border-b border-line">
        <Link href={`/zoznam/${id}`} className="text-sm font-bold text-ink hover:text-accent transition-colors">
          {title} <span className="text-muted font-normal">({items.length}/{itemCount})</span>
        </Link>
        <button
          onClick={copyLink}
          title="Skopírovať odkaz na zoznam"
          aria-label="Skopírovať odkaz na zoznam"
          className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-card transition-colors flex-none"
        >
          <IconLink className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 bg-card">
        {copied && <div className="text-xs text-emerald-600 font-semibold mb-2">Odkaz skopírovaný.</div>}
        {items.length === 0 ? (
          <p className="text-sm text-muted">Zatiaľ žiadne filmy v zozname.</p>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
            {items.map((m) => (
              <Link key={m.slug} href={`/movie/${m.slug}`} className="block group">
                <div className="aspect-[2/3] rounded-md bg-surface bg-cover bg-center group-hover:opacity-90 transition-opacity" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
                <div className="text-[11px] text-ink mt-1.5 leading-snug line-clamp-2">{m.title}</div>
              </Link>
            ))}
          </div>
        )}
        {itemCount > items.length && (
          <Link href={`/zoznam/${id}`} className="inline-block mt-3 text-[11px] font-bold text-white bg-accent px-3 py-1 rounded-full hover:bg-accent-dark">
            VIAC ({itemCount - items.length})
          </Link>
        )}
      </div>
    </div>
  );
}
