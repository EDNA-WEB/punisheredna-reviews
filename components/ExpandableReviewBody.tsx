'use client';

import { useState } from 'react';

const WORD_LIMIT = 50;

export default function ExpandableReviewBody({ html, plainText }: { html: string; plainText: string }) {
  const [expanded, setExpanded] = useState(false);

  const words = plainText.trim().split(/\s+/).filter(Boolean);
  const needsTruncation = words.length > WORD_LIMIT;
  const truncated = words.slice(0, WORD_LIMIT).join(' ');

  return (
    <div>
      {expanded || !needsTruncation ? (
        <div className="article-body text-sm leading-relaxed text-ink font-body" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-sm leading-relaxed text-ink font-body whitespace-pre-wrap">{truncated}…</p>
      )}
      {needsTruncation && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-accent font-semibold hover:underline text-sm mt-1.5"
        >
          {expanded ? 'zobraziť menej' : 'zobraziť celú recenziu'}
        </button>
      )}
    </div>
  );
}
