'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ArticleEditor from './ArticleEditor';
import TagInput from './TagInput';
import { mdToHtml } from '@/lib/markdown';
import { IconUser } from './Icons';

type Initial = { id?: string; title?: string; body?: string; coverImage?: string | null; isDraft?: boolean; tags?: string[] };

export default function BlogPostForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title || '');
  const [body, setBody] = useState(initial?.body || '');
  const [cover, setCover] = useState(initial?.coverImage || '');
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'draft' | 'publish' | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const wasDraft = !!initial?.isDraft;

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1000;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setCover(canvas.toDataURL('image/webp', 0.82));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent, asDraft: boolean) {
    e.preventDefault();
    if (tags.length < 5) {
      setError('Musíš pridať aspoň 5 tagov.');
      return;
    }
    setLoading(asDraft ? 'draft' : 'publish');
    setError('');
    try {
      const payload = { title, body, coverImage: cover || null, isDraft: asDraft, tags };
      const res = await fetch(initial?.id ? `/api/blog/${initial.id}` : '/api/blog', {
        method: initial?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      const id = initial?.id || data.id;
      router.push(asDraft ? `/blog/${id}/upravit` : `/blog/${id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(null);
    }
  }

  return (
    <form onSubmit={(e) => submit(e, false)} className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        {wasDraft ? (
          <div className="text-xs font-semibold text-accent border border-accent/40 px-3 py-1.5 rounded-full w-fit">
            📝 Rozpísané — viditeľné iba tebe, kým to nezverejníš
          </div>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setPreviewMode((p) => !p)}
          className="text-sm font-semibold text-ink border border-line px-4 py-2 rounded-full hover:border-accent hover:text-accent"
        >
          {previewMode ? '← Späť na úpravu' : '👁️ Zobraziť náhľad'}
        </button>
      </div>

      {previewMode ? (
        <div className="border border-line rounded-xl p-6 bg-card">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-4">
            Takto bude článok vyzerať na webe
          </div>

          {cover && <img src={cover} alt={title} className="w-full max-h-[360px] object-cover rounded-xl mb-6 bg-surface" />}

          <h1 className="font-display font-extrabold text-3xl text-ink leading-tight mb-3">{title || 'Názov článku'}</h1>

          <div className="flex items-center gap-3 mb-6 text-sm text-muted">
            <span className="flex items-center gap-2"><IconUser className="w-5 h-5" />Ty</span>
            <span>{new Date().toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
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
        <>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Titulný obrázok (nepovinné)</label>
        <label htmlFor="blog-cover-upload" className="block cursor-pointer">
          {cover ? (
            <img src={cover} alt="" className="w-full max-h-64 object-cover rounded-xl bg-surface" />
          ) : (
            <div className="w-full h-32 rounded-xl bg-surface border border-dashed border-line flex items-center justify-center text-sm text-muted">
              Klikni pre nahratie obrázka
            </div>
          )}
        </label>
        <input id="blog-cover-upload" type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
        {cover && (
          <button type="button" onClick={() => setCover('')} className="text-xs text-danger hover:underline mt-1.5">
            Odstrániť obrázok
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Názov</label>
        <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Tagy (povinné, minimálne 5)</label>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Text článku</label>
        <ArticleEditor value={body} onChange={setBody} />
      </div>

        </>
      )}

      {error && <div className="text-danger text-sm">{error}</div>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading !== null}
          className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
        >
          {loading === 'publish' ? 'Ukladám…' : wasDraft ? 'Zverejniť' : initial?.id ? 'Uložiť zmeny' : 'Uverejniť v profile'}
        </button>
        <button
          type="button"
          onClick={(e) => submit(e, true)}
          disabled={loading !== null}
          className="text-sm font-semibold text-ink border border-line px-6 py-3 rounded-full hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {loading === 'draft' ? 'Ukladám…' : 'Uložiť ako koncept'}
        </button>
      </div>
    </form>
  );
}
