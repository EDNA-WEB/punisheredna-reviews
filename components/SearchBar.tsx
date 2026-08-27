'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ScoreBadge from './ScoreBadge';
import FilterPanel from './FilterPanel';
import { IconUser } from './Icons';
import CriticBadge from './CriticBadge';
import GoldenTicketBadge from './GoldenTicketBadge';
import { useT } from './TranslationProvider';

type MovieResult = { id: string; title: string; slug: string; year: string | null; poster: string | null; percent: number | null; ratingCount: number };
type EpisodeResult = { id: string; title: string | null; number: number; seasonNumber: number; movieTitle: string; movieSlug: string; poster: string | null };
type UserResult = { id: string; name: string; avatar: string | null; role: string; membershipUntil?: string | null };

export default function SearchBar({ variant = 'desktop' }: { variant?: 'desktop' | 'on-accent' }) {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<MovieResult[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setMovies([]);
      setEpisodes([]);
      setUsers([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setMovies(data.movies || []);
        setEpisodes(data.episodes || []);
        setUsers(data.users || []);
        setOpen(true);
      } catch {
        setMovies([]);
        setEpisodes([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function goTo(path: string) {
    setOpen(false);
    setQuery('');
    router.push(path);
  }

  const pillClasses =
    variant === 'on-accent'
      ? 'bg-card border border-white shadow-sm'
      : 'bg-surface border border-line focus-within:border-accent';

  const hasResults = movies.length > 0 || episodes.length > 0 || users.length > 0;

  return (
    <div ref={boxRef} className="relative w-full">
      <div className={`flex items-center gap-1 rounded-full pl-3.5 pr-1.5 py-1.5 ${pillClasses}`}>
        <svg className="w-4 h-4 text-muted flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder={t('search.placeholder')}
          className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none px-1.5"
        />
        <div className="w-px h-5 bg-line flex-none" />
        <FilterPanel />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-line bg-card shadow-lg overflow-hidden text-ink max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted">Hľadám…</div>
          ) : !hasResults ? (
            <div className="px-4 py-3 text-sm text-muted">Nič sa nenašlo pre „{query}“.</div>
          ) : (
            <>
              {movies.length > 0 && (
                <div>
                  <div className="px-3 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Filmy</div>
                  {movies.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => goTo(`/movie/${r.slug}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface text-left border-b border-line last:border-b-0"
                    >
                      <div
                        className="w-10 h-10 rounded-md bg-surface bg-cover bg-center flex-none"
                        style={r.poster ? { backgroundImage: `url('${r.poster}')` } : undefined}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink truncate">{r.title}</div>
                        {r.year && <div className="text-xs text-muted">{r.year}</div>}
                      </div>
                      <ScoreBadge percent={r.percent} count={r.ratingCount} size="sm" />
                    </button>
                  ))}
                </div>
              )}

              {episodes.length > 0 && (
                <div>
                  <div className="px-3 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Epizódy</div>
                  {episodes.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => goTo(`/movie/${e.movieSlug}/sezona/${e.seasonNumber}/epizoda/${e.number}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface text-left border-b border-line last:border-b-0"
                    >
                      <div
                        className="w-10 h-10 rounded-md bg-surface bg-cover bg-center flex-none"
                        style={e.poster ? { backgroundImage: `url('${e.poster}')` } : undefined}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink truncate">
                          {e.title || `Epizóda ${e.number}`}
                        </div>
                        <div className="text-xs text-muted truncate">
                          {e.movieTitle} · S{String(e.seasonNumber).padStart(2, '0')}E{String(e.number).padStart(2, '0')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {users.length > 0 && (
                <div>
                  <div className="px-3 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Používatelia</div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => goTo(`/profile/${u.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface text-left border-b border-line last:border-b-0"
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover flex-none" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center flex-none">
                          <IconUser className="w-4 h-4 text-muted" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-ink truncate">{u.name}</span>
                        {u.role === 'ADMIN' && <CriticBadge size="w-3.5 h-3.5" label={false} />}
                        {u.membershipUntil && new Date(u.membershipUntil) > new Date() && <GoldenTicketBadge size={14} />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
