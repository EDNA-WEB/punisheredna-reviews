'use client';

import { useEffect, useState } from 'react';
import { useT } from '../TranslationProvider';

// Obsah „V článku“ v pravom stĺpci — zvýrazní práve čítanú časť.
// Na zdieľanej verzii (readOnly) je len na čítanie, bez klikania.
export default function ArticleToc({ items, readOnly, hasComments }: { items: { id: string; text: string }[]; readOnly: boolean; hasComments: boolean }) {
  const t = useT();
  const all = [
    { id: 'ap-content', text: t('clanok.uvod', 'Úvod') },
    ...items,
    ...(hasComments ? [{ id: 'diskuze', text: t('clanok.diskuze', 'Diskuze') }] : [])
  ];
  const [active, setActive] = useState(all[0]?.id);

  useEffect(() => {
    const ids = all.map((i) => i.id);
    const onScroll = () => {
      const line = window.innerHeight * 0.3;
      let current = ids[0];
      for (const id of ids) {
        if (id === 'ap-content') continue;
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [items.length, hasComments]); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0) return null;

  return (
    <nav className="ap-card p-[18px] mb-6" aria-label={t('clanok.v_clanku', 'V článku')}>
      <div className="ap-label mb-3">{t('clanok.v_clanku', 'V článku')}</div>
      <ul>
        {all.map((i) => {
          const isActive = i.id === active;
          const inner = (
            <>
              <span className={`ap-toc-bar ${isActive ? 'is-active' : ''}`} aria-hidden="true" />
              <span className="min-w-0">{i.text}</span>
            </>
          );
          return (
            <li key={i.id}>
              {readOnly ? (
                <div className={`ap-toc-item ${isActive ? 'is-active' : ''}`}>{inner}</div>
              ) : (
                <button
                  type="button"
                  className={`ap-toc-item ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => document.getElementById(i.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
