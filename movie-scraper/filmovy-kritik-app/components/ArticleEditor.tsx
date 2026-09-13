'use client';

import { useRef, useState } from 'react';
import { mdToHtml } from '@/lib/markdown';

type MovieOption = { id: string; title: string; slug: string; year: string | null; poster: string | null };
type PersonOption = { id: string; name: string; slug: string; photo: string | null };

function resizeToDataUrl(img: HTMLImageElement, maxWidth: number, quality: number): string {
  const scale = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.82);
}

export default function ArticleEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkPicker, setLinkPicker] = useState<'movie' | 'person' | 'url' | 'youtube' | null>(null);
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<MovieOption[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number; text: string } | null>(null);

  // Undo/Redo — jednoduchá história celého textu. Nová zmena sa zapíše do histórie
  // až po krátkej pauze v písaní (nie po každom jednom znaku), presne ako vo
  // väčšine bežných editorov.
  const historyRef = useRef<string[]>([value]);
  const historyIndexRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  function updateUndoRedoState() {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }

  function pushHistory(next: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // ak sme sa medzičasom vrátili späť a teraz píšeme ďalej, zahodíme "budúcnosť"
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(next);
      historyIndexRef.current = historyRef.current.length - 1;
      updateUndoRedoState();
    }, 400);
  }

  function handleChange(next: string) {
    onChange(next);
    pushHistory(next);
  }

  function undo() {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    onChange(historyRef.current[historyIndexRef.current]);
    updateUndoRedoState();
  }

  function redo() {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    onChange(historyRef.current[historyIndexRef.current]);
    updateUndoRedoState();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (ctrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  }

  function insertAtCursor(before: string, after: string = '', placeholder: string = '') {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    handleChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + before.length + selected.length + after.length;
      ta.setSelectionRange(cursor, cursor);
    });
  }

  function insertText(text: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const next = value.slice(0, start) + text + value.slice(start);
    handleChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + text.length;
      ta.setSelectionRange(cursor, cursor);
    });
  }

  function openUrlLinkPicker() {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      setSelectedRange({ start, end, text: value.slice(start, end) });
    }
    setUrlInput('');
    setLinkPicker('url');
  }

  function confirmUrlLink() {
    if (!urlInput.trim()) return;
    const range = selectedRange;
    const linkText = range && range.text ? range.text : 'odkaz';
    const markdown = `[${linkText}](${urlInput.trim()})`;
    if (range) {
      const next = value.slice(0, range.start) + markdown + value.slice(range.end);
      handleChange(next);
    } else {
      insertText(markdown);
    }
    setLinkPicker(null);
    setUrlInput('');
    setSelectedRange(null);
  }

  function confirmYoutube() {
    if (!urlInput.trim()) return;
    insertText(`\n\n[[youtube:${urlInput.trim()}]]\n\n`);
    setLinkPicker(null);
    setUrlInput('');
  }

  function handleLinkImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setUrlInput(resizeToDataUrl(img, 1400, 0.85));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('Súbor je príliš veľký (max. 8 MB).');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const dataUrl = resizeToDataUrl(img, 1000, 0.82);
        insertText(`\n\n![${file.name}](${dataUrl})\n\n`);
        setUploading(false);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function runSearch(q: string, type: 'movie' | 'person') {
    setQuery(q);
    if (q.trim().length < 2) {
      setMovies([]);
      setPeople([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/editor-search?q=${encodeURIComponent(q.trim())}&type=${type}`);
      const data = await res.json();
      setMovies(data.movies || []);
      setPeople(data.people || []);
    } finally {
      setSearching(false);
    }
  }

  function openLinkPicker(type: 'movie' | 'person') {
    setLinkPicker(type);
    setQuery('');
    setMovies([]);
    setPeople([]);
  }

  function pickMovie(m: MovieOption) {
    insertText(`[${m.title}](/movie/${m.slug})`);
    setLinkPicker(null);
  }

  function pickPerson(p: PersonOption) {
    insertText(`[${p.name}](/osobnost/${p.slug})`);
    setLinkPicker(null);
  }

  return (
    <div>
      <div className="flex items-center gap-1 flex-wrap border border-line border-b-0 rounded-t-xl bg-surface p-1.5">
        <button type="button" title="Späť (Ctrl+Z)" onClick={undo} disabled={!canUndo} className="toolbar-btn disabled:opacity-30">
          ↶
        </button>
        <button type="button" title="Vpred (Ctrl+Y)" onClick={redo} disabled={!canRedo} className="toolbar-btn disabled:opacity-30">
          ↷
        </button>

        <span className="w-px h-5 bg-line mx-1" />

        <button type="button" title="Tučné" onClick={() => insertAtCursor('**', '**', 'tučný text')} className="toolbar-btn font-bold">
          B
        </button>
        <button type="button" title="Kurzíva" onClick={() => insertAtCursor('*', '*', 'kurzíva')} className="toolbar-btn italic">
          I
        </button>
        <button type="button" title="Nadpis" onClick={() => insertAtCursor('\n## ', '', 'Nadpis')} className="toolbar-btn">
          H2
        </button>
        <button type="button" title="Podnadpis" onClick={() => insertAtCursor('\n### ', '', 'Podnadpis')} className="toolbar-btn">
          H3
        </button>
        <button type="button" title="Citácia" onClick={() => insertAtCursor('\n> ', '', 'citácia')} className="toolbar-btn">
          "
        </button>
        <button type="button" title="Zoznam" onClick={() => insertAtCursor('\n- ', '', 'položka')} className="toolbar-btn">
          •
        </button>

        <span className="w-px h-5 bg-line mx-1" />

        <label className="toolbar-btn cursor-pointer" title="Vložiť obrázok">
          {uploading ? '…' : '🖼️ Obrázok'}
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
        </label>
        <button type="button" title="Vložiť YouTube video" onClick={() => setLinkPicker('youtube')} className="toolbar-btn">
          🎥 Video
        </button>
        <button type="button" title="Odkaz na film alebo seriál" onClick={() => openLinkPicker('movie')} className="toolbar-btn">
          🎬 Film
        </button>
        <button type="button" title="Odkaz na osobnosť" onClick={() => openLinkPicker('person')} className="toolbar-btn">
          👤 Osobnosť
        </button>
        <button type="button" title="Označ text a priraď mu odkaz na web alebo obrázok" onClick={openUrlLinkPicker} className="toolbar-btn">
          🔗 Odkaz
        </button>
      </div>

      {linkPicker === 'url' && (
        <div className="border border-line border-b-0 bg-card p-3 space-y-2">
          {selectedRange?.text && (
            <p className="text-xs text-muted">
              Označený text: <span className="text-ink font-semibold">"{selectedRange.text}"</span>
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="field-input-sm flex-1"
              value={urlInput.startsWith('data:') ? '(vložený obrázok)' : urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://…"
              readOnly={urlInput.startsWith('data:')}
            />
            <label className="toolbar-btn cursor-pointer flex-none" title="Alebo nahraj obrázok, na ktorý odkaz povedie">
              🖼️
              <input type="file" accept="image/*" className="hidden" onChange={handleLinkImageUpload} />
            </label>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={confirmUrlLink}
              disabled={!urlInput.trim()}
              className="bg-accent text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
            >
              Vložiť odkaz
            </button>
            <button
              type="button"
              onClick={() => {
                setLinkPicker(null);
                setSelectedRange(null);
                setUrlInput('');
              }}
              className="text-xs text-muted hover:text-ink"
            >
              Zrušiť
            </button>
          </div>
        </div>
      )}

      {linkPicker === 'youtube' && (
        <div className="border border-line border-b-0 bg-card p-3 space-y-2">
          <p className="text-xs text-muted">Vlož odkaz na YouTube video — vloží sa priamo do textu, prehrateľné na mieste.</p>
          <input
            autoFocus
            className="field-input-sm"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={confirmYoutube}
              disabled={!urlInput.trim()}
              className="bg-accent text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-accent-dark disabled:opacity-50"
            >
              Vložiť video
            </button>
            <button type="button" onClick={() => { setLinkPicker(null); setUrlInput(''); }} className="text-xs text-muted hover:text-ink">
              Zrušiť
            </button>
          </div>
        </div>
      )}

      {linkPicker && linkPicker !== 'url' && linkPicker !== 'youtube' && (
        <div className="border border-line border-b-0 bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              autoFocus
              className="field-input-sm flex-1"
              value={query}
              onChange={(e) => runSearch(e.target.value, linkPicker)}
              placeholder={linkPicker === 'movie' ? 'Hľadať film alebo seriál…' : 'Hľadať osobnosť…'}
            />
            <button type="button" onClick={() => setLinkPicker(null)} className="text-xs text-muted hover:text-ink">
              Zrušiť
            </button>
          </div>
          {searching && <p className="text-xs text-muted">Hľadám…</p>}
          {linkPicker === 'movie' && movies.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {movies.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickMovie(m)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface text-left"
                >
                  <div className="w-7 h-10 rounded bg-surface bg-cover bg-center flex-none" style={m.poster ? { backgroundImage: `url('${m.poster}')` } : undefined} />
                  <span className="text-sm text-ink">{m.title} {m.year && <span className="text-muted">({m.year})</span>}</span>
                </button>
              ))}
            </div>
          )}
          {linkPicker === 'person' && people.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPerson(p)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-surface bg-cover bg-center flex-none" style={p.photo ? { backgroundImage: `url('${p.photo}')` } : undefined} />
                  <span className="text-sm text-ink">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <textarea
        ref={textareaRef}
        className="field-input min-h-[300px] rounded-t-none"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={30000}
        placeholder="Píš pokojne v markdowne — **tučné**, *kurzíva*, ## nadpis, > citácia, - zoznam… alebo použi tlačidlá vyššie."
        required
      />

      <style jsx>{`
        .toolbar-btn {
          padding: 5px 9px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          color: var(--color-ink);
        }
        .toolbar-btn:hover {
          background: var(--color-line);
        }
      `}</style>
    </div>
  );
}
