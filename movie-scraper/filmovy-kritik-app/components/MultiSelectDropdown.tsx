'use client';

import { useState, useRef, useEffect } from 'react';
import { IconChevronRight } from './Icons';
import { useT } from './TranslationProvider';

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((x) => x !== value) : [...selected, value]);
  }

  const displayLabel =
    selected.length === 0
      ? `${t('filter.vyber_prefix')} ${label.toLowerCase()} —`
      : selected.length <= 2
      ? selected.join(', ')
      : `${selected.slice(0, 2).join(', ')} +${selected.length - 2}`;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full field-input-sm text-left flex items-center justify-between gap-2"
      >
        <span className={`truncate ${selected.length ? 'text-ink font-medium' : 'text-muted'}`}>{displayLabel}</span>
        <IconChevronRight className={`w-3 h-3 text-muted flex-none transition-transform ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-line bg-card shadow-lg overflow-hidden">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-surface border-b border-line"
            >
              {t('filter.zrusit_vyber')} ({selected.length})
            </button>
          )}
          <div className="max-h-48 overflow-y-auto p-1.5">
            {options.map((o) => (
              <label key={o} className="flex items-center gap-2 text-xs text-ink px-2 py-1 rounded hover:bg-surface cursor-pointer">
                <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="w-3.5 h-3.5 accent-accent flex-none" />
                {o}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
