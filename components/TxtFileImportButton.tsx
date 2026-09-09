'use client';

import { useRef } from 'react';

export default function TxtFileImportButton({ onText }: { onText: (text: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onText((ev.target?.result as string) || '');
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="text-xs font-semibold text-accent border border-line rounded-full px-3 py-1.5 hover:border-accent"
    >
      Nahrať .txt súbor
      <input ref={inputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={handleFile} />
    </button>
  );
}
