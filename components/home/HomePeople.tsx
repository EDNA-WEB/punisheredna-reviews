'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useT } from '../TranslationProvider';
import HomeSectionHead from './HomeSectionHead';
import { HIcon } from './HomeIcons';

export type HomePerson = { id: string; name: string; slug: string; photo: string | null; fans?: number; age?: number | null; years?: string | null };
export type PeopleTab = { key: 'actors' | 'creators' | 'birthdays' | 'deceased'; label: string; href?: string; items: HomePerson[] };

// Osobnosti ako fotokarty: Herci / Tvůrci / Narozeniny dnes / Zemřeli.
export default function HomePeople({ tabs }: { tabs: PeopleTab[] }) {
  const t = useT();
  const visible = tabs.filter((x) => x.items.length > 0);
  const [active, setActive] = useState(0);
  if (!visible.length) return null;
  const tab = visible[Math.min(active, visible.length - 1)];
  return (
    <section>
      <HomeSectionHead icon="user" title={t('home2.osobnosti', 'Osobnosti')} href={tab.href} moreLabel={t('home2.zobrazit_vse', 'Zobrazit vše')}>
        {visible.length > 1 && (
          <div className="hp-seg" role="tablist">
            {visible.map((x, i) => (
              <button key={x.key} type="button" role="tab" aria-selected={i === active} className={i === active ? 'hp-seg-on' : ''} onClick={() => setActive(i)}>
                {x.label}
              </button>
            ))}
          </div>
        )}
      </HomeSectionHead>
      <div key={tab.key} className="hp-row hp-tabs-fade">
        {tab.items.map((p) => (
          <Link key={p.id} href={`/osobnost/${p.slug}`} className={`hp-person ${tab.key === 'deceased' ? 'hp-person-gray' : ''}`} title={p.name}>
            {p.photo ? <img src={p.photo} alt={p.name} loading="lazy" /> : null}
            <span className="hp-person-shade" />
            {tab.key === 'birthdays' && p.age ? (
              <span className="hp-bday">
                <HIcon name="cake" className="w-3 h-3 inline -mt-0.5 mr-0.5" /> {t('home2.let', '{0} let').replace('{0}', String(p.age))}
              </span>
            ) : null}
            {tab.key === 'deceased' && p.years ? <span className="hp-died">{p.years}</span> : null}
            <span className="absolute left-3 right-3 bottom-3">
              <span className="block text-[14px] font-bold text-white truncate">{p.name}</span>
              {typeof p.fans === 'number' && (
                <span className="flex items-center gap-1 text-[11.5px] text-white/70">
                  <HIcon name="heart" className="w-3 h-3" /> {p.fans.toLocaleString('cs-CZ')}
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
