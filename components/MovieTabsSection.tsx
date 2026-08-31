'use client';

import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useT } from './TranslationProvider';

type Tab = { key: string; label: string; content: React.ReactNode; desktopOnly?: boolean };

const GoToTabContext = createContext<(key: string) => void>(() => {});
export function useGoToMovieTab() {
  return useContext(GoToTabContext);
}

export default function MovieTabsSection({ primaryTabs, moreTabs }: { primaryTabs: Tab[]; moreTabs: Tab[] }) {
  const t = useT();
  const allTabs = [...primaryTabs, ...moreTabs];
  const [active, setActive] = useState(allTabs[0]?.key);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const activeTab = allTabs.find((t) => t.key === active);
  // Záložky viditeľné len na desktope (primaryTabs s desktopOnly) musia byť na mobile
  // dosiahnuteľné aspoň cez "Ďalšie" — na desktope sa v tomto menu skryjú, keďže sú už vidieť v hlavnom riadku.
  const desktopOnlyPrimaryTabs = primaryTabs.filter((tab) => tab.desktopOnly);
  const dropdownTabs = [...desktopOnlyPrimaryTabs, ...moreTabs];
  const activeIsInMore = dropdownTabs.some((t) => t.key === active);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash.replace('#tab-', '');
      if (hash && allTabs.some((tab) => tab.key === hash)) {
        setActive(hash);
        document.getElementById('movie-tabs-top')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToTab(key: string) {
    setActive(key);
    document.getElementById('movie-tabs-top')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <GoToTabContext.Provider value={goToTab}>
      <div>
        <div id="movie-tabs-top" className="flex items-stretch gap-1 mb-6 border-b border-line">
          <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap min-w-0">
            {primaryTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={`${tab.desktopOnly ? 'hidden sm:inline-flex' : ''} text-sm font-semibold px-3.5 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  active === tab.key ? 'text-ink border-accent' : 'text-muted border-transparent hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {dropdownTabs.length > 0 && (
            <div className="relative flex-none" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className={`text-sm font-semibold px-3.5 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors flex items-center gap-1 ${
                  activeIsInMore ? 'text-ink border-accent' : 'text-muted border-transparent hover:text-ink'
                }`}
              >
                {activeIsInMore ? activeTab?.label : t('movie.dalsi')} <span className="text-[10px]">▾</span>
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-line bg-card shadow-lg overflow-hidden z-20">
                  {dropdownTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActive(tab.key);
                        setMoreOpen(false);
                      }}
                      className={`${tab.desktopOnly ? 'sm:hidden' : ''} w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surface`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {activeTab?.content}
      </div>
    </GoToTabContext.Provider>
  );
}
