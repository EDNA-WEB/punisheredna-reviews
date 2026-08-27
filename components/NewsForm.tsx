'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArticleEditor from './ArticleEditor';
import TagInput from './TagInput';
import { mdToHtml, readingTime } from '@/lib/markdown';
import { IconUser, IconClock, IconBook } from './Icons';

type Initial = { id?: string; title?: string; summary?: string; coverImage?: string | null; body?: string; movieId?: string | null; publishAt?: string | null; isDraft?: boolean; tags?: string[] };
type MovieOption = { id: string; title: string; year: string | null };

export default function NewsForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const wasDraft = !!initial?.isDraft;

  const [title, setTitle] = useState(initial?.title || '');
  const [summary, setSummary] = useState(initial?.summary || '');
  const [cover, setCover] = useState(initial?.coverImage || '');
  const [body, setBody] = useState(initial?.body || '');
  const [movieId, setMovieId] = useState(initial?.movieId || '');
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [publishAt, setPublishAt] = useState(() => {
    if (!initial?.publishAt) return '';
    const d = new Date(initial.publishAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [movies, setMovies] = useState<MovieOption[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'draft' | 'publish' | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetch('/api/movies').then((r) => r.json()).then(setMovies).catch(() => {});
  }, []);

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setCover(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent, asDraft: boolean) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Zadaj prosím názov novinky.');
      return;
    }
    if (tags.length < 5) {
      setError('Musíš pridať aspoň 5 tagov.');
      return;
    }
    setLoading(asDraft ? 'draft' : 'publish');
    setError('');
    try {
      const payload = { title, summary, coverImage: cover, body, movieId: movieId || null, publishAt: publishAt || null, isDraft: asDraft, tags };
      const res = await fetch(isEdit ? `/api/news/${initial!.id}` : '/api/news', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      router.push(asDraft ? `/admin/news/${data.id}/edit` : '/admin/news');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  }

  const statusLabel = wasDraft
    ? { text: '📝 Rozpísané', className: 'text-accent border-accent/40 bg-surface' }
    : publishAt && new Date(publishAt) > new Date()
    ? { text: '🕐 Naplánované', className: 'text-accent border-accent/40 bg-surface' }
    : isEdit
    ? { text: '✓ Publikované', className: 'text-emerald-600 border-emerald-300 bg-emerald-50' }
    : { text: 'Nová novinka', className: 'text-muted border-line bg-surface' };

  return (
    <form onSubmit={(e) => submit(e, false)}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <span className={`text-xs font-semibold border px-3 py-1.5 rounded-full ${statusLabel.className}`}>{statusLabel.text}</span>
        <button
          type="button"
          onClick={() => setPreviewMode((p) => !p)}
          className="text-sm font-semibold text-ink border border-line px-4 py-2 rounded-full hover:border-accent hover:text-accent transition-colors"
        >
          {previewMode ? '← Späť na úpravu' : '👁️ Zobraziť náhľad'}
        </button>
      </div>

      {previewMode ? (
        <div className="max-w-2xl border border-line rounded-xl p-6 bg-card">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-4">Takto bude článok vyzerať na webe</div>
          {cover && <img src={cover} alt={title} className="w-full max-h-[360px] object-cover rounded-xl mb-6 bg-surface" />}
          <h1 className="font-display font-extrabold text-3xl text-ink leading-tight mb-3">{title || 'Názov novinky'}</h1>
          <div className="flex items-center gap-3 flex-wrap text-sm text-muted mb-6">
            <span className="flex items-center gap-1.5"><IconUser className="w-4 h-4" />PunisherEDNA</span>
            <span className="flex items-center gap-1.5">
              <IconClock className="w-4 h-4" />
              {new Date().toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5"><IconBook className="w-4 h-4" />{readingTime(body)} min čítania</span>
          </div>
          <div
            className="article-body text-lg leading-relaxed text-ink font-body mb-6"
            dangerouslySetInnerHTML={{ __html: mdToHtml(body) || '<p class="text-muted">Zatiaľ nič nenapísané…</p>' }}
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="text-xs font-semibold text-accent bg-surface border border-accent/40 px-2.5 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
          {/* Hlavný stĺpec — písanie */}
          <div className="space-y-5 min-w-0">
            <input
              className="w-full text-3xl font-display font-extrabold text-ink bg-transparent border-0 border-b-2 border-line focus:border-accent outline-none pb-3 transition-colors placeholder:text-line"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Názov novinky…"
            />

            <input
              className="w-full text-[15px] text-muted bg-transparent border-0 outline-none placeholder:text-muted/60"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={200}
              placeholder="Krátky popis, čo sa zobrazí na karte novinky (1–2 vety)…"
            />

            <ArticleEditor value={body} onChange={setBody} />

            <div className="border-t border-line pt-5">
              <label className="block text-sm font-semibold text-ink mb-2">Tagy</label>
              <TagInput tags={tags} onChange={setTags} />
            </div>
          </div>

          {/* Bočný panel — publikovanie a nastavenia */}
          <div className="space-y-4 lg:sticky lg:top-4">
            <div className="border border-line rounded-xl overflow-hidden">
              <div className="bg-surface px-4 py-2.5 border-b border-line">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Publikovanie</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Naplánovať na presný čas</label>
                  <input
                    type="datetime-local"
                    className="field-input-sm w-full"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                  />
                  <p className="text-[11px] text-muted mt-1.5">
                    {publishAt
                      ? 'Nezobrazí sa nikde na webe, kým tento čas nenastane.'
                      : 'Necháš prázdne → zverejní sa okamžite.'}
                  </p>
                  {publishAt && (
                    <button type="button" onClick={() => setPublishAt('')} className="text-[11px] text-danger hover:underline mt-1">
                      Zrušiť plánovanie
                    </button>
                  )}
                </div>

                {error && <div className="text-danger text-xs">{error}</div>}

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading !== null}
                    className="w-full bg-accent text-white px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-colors"
                  >
                    {loading === 'publish' ? 'Ukladám…' : wasDraft ? 'Zverejniť' : isEdit ? 'Uložiť zmeny' : 'Publikovať novinku'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => submit(e, true)}
                    disabled={loading !== null}
                    className="w-full text-sm font-semibold text-ink border border-line px-4 py-2.5 rounded-full hover:border-accent hover:text-accent disabled:opacity-50 transition-colors"
                  >
                    {loading === 'draft' ? 'Ukladám…' : 'Uložiť ako koncept'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full text-xs font-semibold text-muted hover:text-ink py-1.5"
                  >
                    Zrušiť
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-line rounded-xl overflow-hidden">
              <div className="bg-surface px-4 py-2.5 border-b border-line">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Titulný obrázok</h3>
              </div>
              <div className="p-4">
                <label
                  htmlFor="news-cover-upload"
                  className="group relative block rounded-lg cursor-pointer bg-cover bg-center aspect-video overflow-hidden border border-dashed border-line"
                  style={cover ? { backgroundImage: `url('${cover}')` } : undefined}
                >
                  {cover ? (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="text-white text-xs font-semibold">Zmeniť obrázok</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted gap-1">
                      <span className="text-2xl">🖼️</span>
                      <span className="text-xs font-semibold">Klikni pre nahratie</span>
                    </div>
                  )}
                </label>
                <input id="news-cover-upload" type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                {cover && (
                  <button type="button" onClick={() => setCover('')} className="text-[11px] text-danger hover:underline mt-2">
                    Odstrániť obrázok
                  </button>
                )}
              </div>
            </div>

            <div className="border border-line rounded-xl overflow-hidden">
              <div className="bg-surface px-4 py-2.5 border-b border-line">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Súvisiaci film</h3>
              </div>
              <div className="p-4">
                <select className="field-input-sm w-full" value={movieId} onChange={(e) => setMovieId(e.target.value)}>
                  <option value="">— Žiadny konkrétny film —</option>
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}{m.year ? ` (${m.year})` : ''}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted mt-1.5">Zobrazí sa aj v profiloch hercov, ktorí v ňom hrali.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
