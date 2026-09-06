'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IconUser } from './Icons';
import CriticBadge from './CriticBadge';
import { useT } from './TranslationProvider';

type UserResult = { id: string; name: string; avatar: string | null; role: string; membershipUntil?: string | null };

export default function NewMessageSearch({ dark }: { dark?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [open, setOpen] = useState(false);
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
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        setResults(await res.json());
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div ref={boxRef} className={dark ? 'relative' : 'relative mb-4'}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${dark ? 'text-[#8696a0]' : 'text-muted'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim().length >= 2 && setOpen(true)}
            placeholder={t('spravy.hladat_uzivatelov')}
            className={dark ? 'w-full py-2 text-sm bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] border-0 rounded-lg outline-none' : 'field-input py-2 text-sm'}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <button
          onClick={() => setOpen((o) => query.trim().length >= 2 ? !o : o)}
          className={
            dark
              ? 'bg-[#00a884] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#029271] flex-none'
              : 'bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-accent-dark flex-none'
          }
        >
          {t('spravy.napisat')}
        </button>
      </div>

      {open && (
        <div className={`absolute z-50 mt-2 w-full rounded-xl border shadow-lg overflow-hidden ${dark ? 'border-black/30 bg-[#233138]' : 'border-line bg-card'}`}>
          {results.length === 0 ? (
            <div className={`px-4 py-3 text-sm ${dark ? 'text-[#8696a0]' : 'text-muted'}`}>{t('spravy.nic_najdene')}</div>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                onClick={() => router.push(`/messages/${u.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b last:border-b-0 ${
                  dark ? 'hover:bg-[#2a3942] border-black/20' : 'hover:bg-surface border-line'
                }`}
              >
                {u.avatar ? (
                  <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover flex-none" />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-none ${dark ? 'bg-[#2a3942]' : 'bg-surface'}`}>
                    <IconUser className={`w-4 h-4 ${dark ? 'text-[#8696a0]' : 'text-muted'}`} />
                  </div>
                )}
                <span className={`text-sm font-semibold ${dark ? 'text-[#e9edef]' : 'text-ink'}`}>{u.name}</span>
                {u.role === 'ADMIN' && <CriticBadge size="w-3.5 h-3.5" label={false} />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
