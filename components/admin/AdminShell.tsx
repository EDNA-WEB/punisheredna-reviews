'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AdminIcon from './AdminIcon';
import { ADMIN_NAV, isNavActive, type AdminNavItem } from './adminNav';

type Props = {
  children: React.ReactNode;
  userName: string;
  userAvatar: string | null;
  isAdmin: boolean;
  badges: Record<string, number>; // href → počet čakajúcich položiek
  embed?: boolean; // otvorené z appky — len obsah, bez panela a lišty
};

// Rozhranie administrácie: bočný panel so sekciami, horná lišta s rýchlym
// vyhľadávaním (Ctrl/⌘ + K) a obsah. Na mobile sa panel vysúva zboku.
export default function AdminShell({ children, userName, userAvatar, isAdmin, badges, embed }: Props) {
  const pathname = usePathname() || '/admin';
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(
    () => ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => isAdmin || i.editor) })).filter((g) => g.items.length > 0),
    [isAdmin]
  );
  const flat = useMemo(() => groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))), [groups]);
  const current = flat.find((i) => isNavActive(i, pathname)) || flat.filter((i) => pathname.startsWith(i.href)).sort((a, b) => b.href.length - a.href.length)[0];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return flat;
    return flat.filter((i) => `${i.label} ${i.group}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q));
  }, [query, flat]);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 0);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function go(item: AdminNavItem) {
    setSearchOpen(false);
    setQuery('');
    router.push(item.href);
  }

  const nav = (
    <nav className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="px-3 mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted/80">{g.label}</div>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const active = current?.href === item.href;
              const badge = badges[item.href] || 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13.5px] transition-colors ${
                      active ? 'bg-accent/10 text-accent font-semibold' : 'text-ink/80 hover:bg-surface hover:text-ink'
                    }`}
                  >
                    <AdminIcon name={item.icon} className={`w-[18px] h-[18px] flex-none ${active ? 'text-accent' : 'text-muted group-hover:text-ink'}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5 px-3">
      <svg viewBox="0 0 100 100" className="w-8 h-8" aria-hidden>
        <defs>
          <linearGradient id="adm-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFE08A" />
            <stop offset="0.45" stopColor="#F5B90B" />
            <stop offset="1" stopColor="#C98A00" />
          </linearGradient>
        </defs>
        <g fill="url(#adm-gold)" transform="translate(0 6)">
          <path d="M14 62 L18 30 L34 47 L50 20 L66 47 L82 30 L86 62 Z M45 37 L45 56 L60 46.5 Z" fillRule="evenodd" stroke="url(#adm-gold)" strokeWidth="5" strokeLinejoin="round" />
          <circle cx="18" cy="27" r="5" />
          <circle cx="50" cy="15.5" r="5.5" />
          <circle cx="82" cy="27" r="5" />
          <rect x="12" y="66" width="76" height="15" rx="4" />
        </g>
      </svg>
      <div className="leading-tight">
        <div className="font-display font-extrabold text-[15px] text-ink">KrálFilmu</div>
        <div className="text-[11px] text-muted">Administrace</div>
      </div>
    </Link>
  );

  // Vložený režim (WebView v appke): rovnaký obsah, len bez panela a lišty
  if (embed) {
    return (
      <div className="min-h-screen bg-bg">
        <main className="admin-content admin-embed px-4 pt-1 pb-12">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Bočný panel — počítač */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[260px] flex-col border-r border-line bg-card z-30">
        <div className="h-16 flex items-center border-b border-line">{brand}</div>
        <div className="flex-1 overflow-y-auto px-3 py-5">{nav}</div>
        <div className="border-t border-line p-3">
          <Link href="/" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-muted hover:text-ink hover:bg-surface">
            <AdminIcon name="external" className="w-4 h-4" /> Zobrazit web
          </Link>
        </div>
      </aside>

      {/* Bočný panel — mobil (vysúvací) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-card border-r border-line flex flex-col shadow-xl">
            <div className="h-16 flex items-center justify-between border-b border-line pr-3">
              {brand}
              <button type="button" onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-surface text-muted" aria-label="Zavřít menu">
                <AdminIcon name="close" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-5">{nav}</div>
          </aside>
        </div>
      )}

      <div className="lg:pl-[260px]">
        {/* Horná lišta */}
        <header className="sticky top-0 z-20 h-16 border-b border-line bg-card/85 backdrop-blur flex items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface text-muted" aria-label="Otevřít menu">
            <AdminIcon name="menu" />
          </button>
          <div className="min-w-0">
            <div className="text-[11px] text-muted truncate">{current?.group || 'Administrace'}</div>
            <div className="font-semibold text-[15px] text-ink truncate -mt-0.5">{current?.label || 'Administrace'}</div>
          </div>

          <div className="flex-1" />

          {/* Rýchle vyhľadávanie sekcií */}
          <div className="relative hidden sm:block w-72">
            <AdminIcon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
                if (e.key === 'Enter' && results[highlight]) go(results[highlight]);
              }}
              placeholder="Přejít na sekci…"
              className="w-full h-9 pl-9 pr-14 rounded-lg border border-line bg-surface text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted border border-line rounded px-1.5 py-0.5 bg-card">Ctrl K</kbd>
            {searchOpen && results.length > 0 && (
              <div className="absolute right-0 mt-2 w-full max-h-80 overflow-y-auto rounded-xl border border-line bg-card shadow-xl py-1.5">
                {results.map((r, i) => (
                  <button
                    key={r.href}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(r)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm ${i === highlight ? 'bg-surface' : ''}`}
                  >
                    <AdminIcon name={r.icon} className="w-4 h-4 text-muted" />
                    <span className="flex-1 text-ink">{r.label}</span>
                    <span className="text-[11px] text-muted">{r.group}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link href="/" className="hidden md:flex items-center gap-1.5 text-[13px] text-muted hover:text-ink px-2">
            <AdminIcon name="external" className="w-4 h-4" /> Web
          </Link>
          <div className="flex items-center gap-2 pl-2 border-l border-line">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="w-8 h-8 rounded-full object-cover bg-surface" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center">{userName.slice(0, 1).toUpperCase()}</div>
            )}
            <div className="hidden md:block leading-tight">
              <div className="text-[13px] font-semibold text-ink">{userName}</div>
              <div className="text-[11px] text-muted">{isAdmin ? 'Administrátor' : 'Redaktor'}</div>
            </div>
          </div>
        </header>

        <main className="admin-content px-4 sm:px-6 lg:px-8 pb-16 max-w-[1400px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
