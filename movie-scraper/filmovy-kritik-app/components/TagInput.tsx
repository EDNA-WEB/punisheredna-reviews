'use client';

import { useState } from 'react';

const MIN_TAGS = 5;

export default function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function addTag() {
    const clean = draft.trim().toLowerCase().replace(/\s+/g, '-');
    if (!clean) return;
    if (tags.includes(clean)) {
      setDraft('');
      return;
    }
    if (tags.length >= 15) return;
    onChange([...tags, clean]);
    setDraft('');
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const remaining = MIN_TAGS - tags.length;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-surface border border-accent/40 px-2.5 py-1 rounded-full">
            #{tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-danger">
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        className="field-input-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder="Napíš tag a stlač Enter…"
      />
      <p className={`text-xs mt-1.5 ${remaining > 0 ? 'text-danger font-semibold' : 'text-muted'}`}>
        {remaining > 0
          ? `Povinné — pridaj ešte aspoň ${remaining} ${remaining === 1 ? 'tag' : remaining < 5 ? 'tagy' : 'tagov'} (minimum ${MIN_TAGS}).`
          : `${tags.length} ${tags.length === 1 ? 'tag' : tags.length < 5 ? 'tagy' : 'tagov'} — vďaka nim sa článok objaví aj medzi súvisiacimi článkami.`}
      </p>
    </div>
  );
}
