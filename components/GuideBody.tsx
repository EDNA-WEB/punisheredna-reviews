'use client';

import { useState } from 'react';

type Item = { id: string; question: string; answer: string };

export default function GuideBody({ items }: { items: Item[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id || '');

  function goTo(id: string) {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
      <div className="border border-line rounded-xl overflow-hidden lg:sticky lg:top-4 max-h-[80vh] overflow-y-auto">
        <div className="bg-surface px-4 py-2.5 border-b border-line">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">Otázky</h2>
        </div>
        <nav className="p-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(item.id)}
              className={`block w-full text-left text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${
                activeId === item.id ? 'bg-accent/10 text-accent' : 'text-ink hover:bg-surface'
              }`}
            >
              {item.question}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-8 min-w-0">
        {items.map((item) => (
          <div key={item.id} id={item.id} className="scroll-mt-4 border border-line rounded-xl p-5 bg-card">
            <h2 className="font-display font-bold text-lg text-ink mb-3">{item.question}</h2>
            <div className="text-sm text-muted leading-relaxed whitespace-pre-line">{item.answer}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
