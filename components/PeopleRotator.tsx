'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PersonMiniGrid from './PersonMiniGrid';
import PersonMemorialGrid from './PersonMemorialGrid';
import { IconCake, IconCandle } from './Icons';

// Jeden box na hlavnej stránke namiesto štyroch: Najsledovanejší herci →
// tvorcovia → Dnes slávia narodeniny → Naposledy zomreli. Každých 30 s sa
// sám prepne. Prepínanie cez pomenované záložky v hlavičke (aktívna sa
// postupne podčiarkuje, klik = skok na skupinu).
// Prechod: staré fotky odplávajú doľava s rozostrením, cez box prebehne
// jemný svetelný záblesk a nové fotky nabehnú jedna po druhej.
// Pri prejdení myšou sa striedanie pozastaví.

type Person = { id: string; name: string; slug: string; photo: string | null; birthDate?: Date | string | null; deathDate?: Date | string | null };
export type RotatorTab = {
  key: 'actors' | 'creators' | 'birthdays' | 'deceased';
  label: string;
  title: string;
  moreHref?: string;
  items: Person[];
};

const INTERVAL_S = 30;
const OUT_MS = 450;

function Content({ tab, animateIn }: { tab: RotatorTab; animateIn: boolean }) {
  return tab.key === 'actors' || tab.key === 'creators' ? (
    <PersonMiniGrid title={tab.title} items={tab.items} noWrapper hideHeader animateIn={animateIn} />
  ) : (
    <PersonMemorialGrid title={tab.title} items={tab.items as any} mode={tab.key === 'birthdays' ? 'birthday' : 'death'} hideHeader animateIn={animateIn} />
  );
}

export default function PeopleRotator({ tabs, moreLabel }: { tabs: RotatorTab[]; moreLabel: string }) {
  const visible = tabs.filter((t) => t.items.length > 0);
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const outTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (outTimer.current) clearTimeout(outTimer.current);
  }, []);

  if (visible.length === 0) return null;
  const idx = active % visible.length;
  const tab = visible[idx];

  function go(next: number) {
    const n = ((next % visible.length) + visible.length) % visible.length;
    if (n === idx) return;
    setPrev(idx);
    setActive(n);
    setCycle((c) => c + 1);
    if (outTimer.current) clearTimeout(outTimer.current);
    outTimer.current = setTimeout(() => setPrev(null), OUT_MS);
  }

  const icon =
    tab.key === 'birthdays' ? <IconCake className="w-4 h-4 text-accent" /> : tab.key === 'deceased' ? <IconCandle className="w-4 h-4 text-muted" /> : null;

  return (
    <div
      className="border border-line rounded-xl bg-card min-w-0 overflow-hidden relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <style>{`
        @keyframes prTileIn { from { opacity: 0; transform: translateY(14px) scale(.9); filter: blur(6px) } to { opacity: 1; transform: none; filter: none } }
        @keyframes prOut { to { opacity: 0; transform: translateX(-32px) scale(.97); filter: blur(5px) } }
        @keyframes prTitleIn { from { opacity: 0; transform: translateY(10px); filter: blur(3px) } to { opacity: 1; transform: none; filter: none } }
        @keyframes prSweep { from { transform: translateX(-120%) } to { transform: translateX(120%) } }
        @keyframes prBar { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @media (prefers-reduced-motion: reduce) { .pr-motion { animation: none !important } }
      `}</style>

      {/* Svetelný záblesk pri zmene skupiny */}
      {cycle > 0 && (
        <div
          key={`sweep-${cycle}`}
          aria-hidden
          className="pr-motion pointer-events-none absolute inset-y-0 left-0 w-full z-10"
          style={{
            background: 'linear-gradient(100deg, transparent 20%, rgba(120, 160, 255, 0.14) 50%, transparent 80%)',
            animation: 'prSweep 1s cubic-bezier(.4,0,.2,1) both'
          }}
        />
      )}

      <div className="p-4 sm:p-5">
        {/* Hlavička: nadpis aktívnej skupiny, pomenované záložky (aktívna sa
            postupne podčiarkuje — po naplnení sa prepne na ďalšiu) a „více“. */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 key={`t-${cycle}`} className="pr-motion font-display font-bold text-base text-ink flex items-center gap-2 min-w-0" style={{ animation: 'prTitleIn .6s cubic-bezier(.16,1,.3,1) both' }}>
            {icon}
            <span className="truncate">{tab.title}</span>
          </h2>
          <div className="flex items-center gap-3 min-w-0">
            {visible.length > 1 && (
              <div className="flex gap-1 bg-surface p-1 rounded-full overflow-x-auto [scrollbar-width:none]" role="tablist">
                {visible.map((t, i) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={i === idx}
                    title={t.title}
                    onClick={() => go(i)}
                    className={`relative overflow-hidden px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      i === idx ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {t.label}
                    {i === idx && (
                      <span
                        key={`bar-${cycle}`}
                        aria-hidden
                        className="absolute left-2 right-2 bottom-0.5 h-[2px] rounded-full bg-accent origin-left"
                        style={{ animation: `prBar ${INTERVAL_S}s linear both`, animationPlayState: paused ? 'paused' : 'running' }}
                        onAnimationEnd={() => go(idx + 1)}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
            {tab.moreHref && (
              <Link href={tab.moreHref} className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark flex-none">
                {moreLabel}
              </Link>
            )}
          </div>
        </div>

        {/* Obsah — stará skupina odchádza, nová nabieha */}
        <div className="relative">
          {prev !== null && visible[prev] && (
            <div aria-hidden className="pr-motion absolute inset-0 pointer-events-none" style={{ animation: `prOut ${OUT_MS}ms cubic-bezier(.4,0,1,1) both` }}>
              <Content tab={visible[prev]} animateIn={false} />
            </div>
          )}
          <div key={`c-${idx}-${cycle}`}>
            <Content tab={tab} animateIn={cycle > 0} />
          </div>
        </div>
      </div>
    </div>
  );
}
