'use client';

import { useState } from 'react';
import { useT } from './TranslationProvider';

export default function ExpandableSynopsis({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const t = useT();

  // Skús nájsť rozumné miesto na skrátenie — po 2. vete, alebo po ~220 znakoch.
  const sentenceEnd = text.split(/(?<=[.!?])\s+/);
  let shortText = sentenceEnd.slice(0, 2).join(' ');
  if (shortText.length > 260 || sentenceEnd.length <= 2) {
    shortText = text.slice(0, 220);
  }
  const needsTruncation = shortText.length < text.length;

  return (
    <p className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap">
      {expanded || !needsTruncation ? text : `${shortText.trimEnd()}… `}
      {needsTruncation && (
        <button onClick={() => setExpanded((e) => !e)} className="text-accent font-semibold hover:underline text-sm">
          {expanded ? t('movie.menej') : t('movie.viac')}
        </button>
      )}
    </p>
  );
}
