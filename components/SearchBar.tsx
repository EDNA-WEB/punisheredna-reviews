'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ScoreBadge from './ScoreBadge';
import FilterPanel from './FilterPanel';
import { IconUser, IconSearch } from './Icons';
import CriticBadge from './CriticBadge';
import { useT } from './TranslationProvider';

type MovieResult = { id: string; title: string; slug: string; year: string | null; poster: string | null; percent: number | null; ratingCount: number };
type EpisodeResult = { id: string; title: string | null; number: number; seasonNumber: number; movieTitle: string; movieSlug: string; poster: string | null };
type PersonResult = { id: string; name: string; slug: string; photo: string | null; role: string; subRole: string | null; birthYear: number | null };
type UserResult = { id: string; name: string; avatar: string | null; role: string; membershipUntil?: string | null };

export default function SearchBar({ variant = 'desktop' }: { variant?: 'desktop' | 'on-accent' }) {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<MovieResult[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [people, setPeople] = useState<PersonResult[]>([]);
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
      setPeople([]);
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
        setPeople(data.people || []);
        setOpen(true);
      } catch {
        setMovies([]);
        setEpisodes([]);
        setUsers([]);
        setPeople([]);
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

  const hasResults = movies.length > 0 || episodes.length > 0 || users.length > 0 || people.length > 0;

  return (
    <div ref={boxRef} className="relative w-full">
      <div className={`flex items-center gap-1 rounded-full pl-3.5 pr-1.5 py-1.5 ${pillClasses}`}>
        <IconSearch className="w-[18px] h-[18px] text-muted flex-none" />
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
            <div className="px-4 py-3 text-sm text-muted">Hledám…</div>
          ) : !hasResults ? (
            <div className="px-4 py-3 text-sm text-muted">Nic se nenašlo pro „{query}“.</div>
          ) : (
            <>
              {movies.length > 0 && (
                <div>
                  <div className="px-3 pt-2.5 pb-1 text-xs font-bold uppercase tracking-wide text-muted">Filmy</div>
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

              {people.length > 0 && (
                <div>
                  <div className="px-3 pt-2.5 pb-1 text-xs font-bold uppercase tracking-wide text-muted">{t('search.osobnosti', 'Osobnosti')}</div>
                  {people.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => goTo(`/osobnost/${p.slug}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface text-left border-b border-line last:border-b-0"
                    >
                      {p.photo ? (
                        <img src={p.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-none bg-surface" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center flex-none">
                          <IconUser className="w-4 h-4 text-muted" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink truncate">{p.name}</div>
                        <div className="text-xs text-muted truncate">
                          {[p.subRole || (p.role === 'CREATOR' ? t('search.tvorca', 'Tvůrce') : t('search.herec', 'Herec')), p.birthYear ? `${t('search.nar', 'nar.')} ${p.birthYear}` : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {episodes.length > 0 && (
                <div>
                  <div className="px-3 pt-2.5 pb-1 text-xs font-bold uppercase tracking-wide text-muted">Epizódy</div>
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
                  <div className="px-3 pt-2.5 pb-1 text-xs font-bold uppercase tracking-wide text-muted">Uživatelé</div>
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
