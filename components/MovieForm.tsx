'use client';

import { useState, useEffect } from 'react';
import { CONTENT_TYPES } from '@/lib/filterConstants';
import { useRouter } from 'next/navigation';

type Initial = {
  id?: string;
  title?: string;
  originalTitle?: string | null;
  poster?: string | null;
  genres?: string | null;
  countries?: string | null;
  year?: string | null;
  runtimeMinutes?: number | null;
  director?: string | null;
  screenplay?: string | null;
  cinematography?: string | null;
  music?: string | null;
  cast?: string | null;
  synopsis?: string | null;
  trailerUrl?: string | null;
  watchUrl?: string | null;
  nowShowing?: boolean;
  contentType?: string;
  hasSubtitles?: boolean;
  hasDubbing?: boolean;
  releaseDate?: string | Date | null;
  distributor?: string | null;
  tags?: string | null;
  budget?: number | null;
  marketingBudget?: number | null;
  boxOffice?: number | null;
  domesticBoxOffice?: number | null;
  internationalBoxOffice?: number | null;
};

export default function MovieForm({ initial, redirectTo }: { initial?: Initial; redirectTo?: string }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [title, setTitle] = useState(initial?.title || '');
  const [originalTitle, setOriginalTitle] = useState(initial?.originalTitle || '');
  const [poster, setPoster] = useState(initial?.poster || '');
  const [genres, setGenres] = useState(initial?.genres || '');
  const [countries, setCountries] = useState(initial?.countries || '');
  const [year, setYear] = useState(initial?.year || '');
  const [runtimeMinutes, setRuntimeMinutes] = useState(initial?.runtimeMinutes?.toString() || '');
  const [director, setDirector] = useState(initial?.director || '');
  const [screenplay, setScreenplay] = useState(initial?.screenplay || '');
  const [cinematography, setCinematography] = useState(initial?.cinematography || '');
  const [music, setMusic] = useState(initial?.music || '');
  const [cast, setCast] = useState(initial?.cast || '');
  const [synopsis, setSynopsis] = useState(initial?.synopsis || '');
  const [trailerUrl, setTrailerUrl] = useState(initial?.trailerUrl || '');
  const [watchUrl, setWatchUrl] = useState(initial?.watchUrl || '');
  const [nowShowing, setNowShowing] = useState(initial?.nowShowing || false);

  useEffect(() => {
    if (year && Number(year) < 2026 && nowShowing) setNowShowing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);
  const [contentType, setContentType] = useState(initial?.contentType || 'Film');
  const [hasSubtitles, setHasSubtitles] = useState(initial?.hasSubtitles || false);
  const [hasDubbing, setHasDubbing] = useState(initial?.hasDubbing || false);
  const [releaseDate, setReleaseDate] = useState(initial?.releaseDate ? new Date(initial.releaseDate).toISOString().slice(0, 10) : '');
  const [distributor, setDistributor] = useState(initial?.distributor || '');
  const [tags, setTags] = useState(initial?.tags || '');
  const [budget, setBudget] = useState(initial?.budget?.toString() || '');
  const [marketingBudget, setMarketingBudget] = useState(initial?.marketingBudget?.toString() || '');
  const [boxOffice, setBoxOffice] = useState(initial?.boxOffice?.toString() || '');
  const [domesticBoxOffice, setDomesticBoxOffice] = useState(initial?.domesticBoxOffice?.toString() || '');
  const [internationalBoxOffice, setInternationalBoxOffice] = useState(initial?.internationalBoxOffice?.toString() || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handlePosterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 700;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPoster(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Zadaj prosím názov filmu.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        title, originalTitle, poster, genres, countries, year,
        runtimeMinutes: runtimeMinutes ? Number(runtimeMinutes) : null,
        director, screenplay, cinematography, music, cast, synopsis, trailerUrl, watchUrl, nowShowing, contentType,
        hasSubtitles, hasDubbing,
        releaseDate: releaseDate || null,
        distributor: distributor || null,
        tags: tags || null,
        budget: budget ? Number(budget) : null,
        marketingBudget: marketingBudget ? Number(marketingBudget) : null,
        boxOffice: boxOffice ? Number(boxOffice) : null,
        domesticBoxOffice: domesticBoxOffice ? Number(domesticBoxOffice) : null,
        internationalBoxOffice: internationalBoxOffice ? Number(internationalBoxOffice) : null
      };
      const res = await fetch(isEdit ? `/api/movies/${initial!.id}` : '/api/movies', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Uloženie zlyhalo.');
      router.push(redirectTo || '/admin/movies');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Plagát</label>
        <label
          htmlFor="poster-upload"
          className="block border-2 border-dashed border-line rounded-xl p-5 text-center text-muted text-sm cursor-pointer bg-cover bg-center min-h-[140px] flex items-center justify-center"
          style={poster ? { backgroundImage: `url('${poster}')`, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)', backgroundColor: 'rgba(0,0,0,0.25)', backgroundBlendMode: 'darken' } : undefined}
        >
          {poster ? 'Klikni pre zmenu plagátu' : 'Klikni a vyber plagát filmu'}
        </label>
        <input id="poster-upload" type="file" accept="image/*" className="hidden" onChange={handlePosterUpload} />
      </div>

      {contentType !== 'Seriál' && (
      <div className="border border-line rounded-xl p-4 bg-surface space-y-3">
        <div className="text-xs font-bold uppercase tracking-wide text-muted">Box Office</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Rozpočet ($)</label>
            <input type="number" min="0" className="field-input-sm" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="napr. 150000000" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Marketing ($)</label>
            <input type="number" min="0" className="field-input-sm" value={marketingBudget} onChange={(e) => setMarketingBudget(e.target.value)} placeholder="napr. 100000000" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Tržby spolu ($)</label>
            <input type="number" min="0" className="field-input-sm" value={boxOffice} onChange={(e) => setBoxOffice(e.target.value)} placeholder="napr. 400000000" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Domáce tržby ($)</label>
            <input type="number" min="0" className="field-input-sm" value={domesticBoxOffice} onChange={(e) => setDomesticBoxOffice(e.target.value)} placeholder="napr. 180000000" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Medzinárodné tržby ($)</label>
            <input type="number" min="0" className="field-input-sm" value={internationalBoxOffice} onChange={(e) => setInternationalBoxOffice(e.target.value)} placeholder="napr. 220000000" />
          </div>
        </div>
        <p className="text-xs text-muted">Domáce a medzinárodné tržby sú nepovinné — ak ich vyplníš, na profile filmu pribudne okienko s rozpadom po prejdení myšou.</p>
      </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Dátum premiéry</label>
        <input type="date" className="field-input" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
        <p className="text-xs text-muted mt-1.5">Kým tento dátum nenastane, používatelia nemôžu film hodnotiť ani naň písať recenziu.</p>
      </div>

      {contentType === 'Seriál' && (
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Služba</label>
          <input
            className="field-input"
            value={distributor}
            onChange={(e) => setDistributor(e.target.value)}
            placeholder="napr. Netflix, HBO Max, Disney+…"
          />
          <p className="text-xs text-muted mt-1.5">
            Streamovacia služba, káblovka alebo kde seriál vychádza.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Tagy</label>
        <input className="field-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="napr. Stargate, Hviezdna brána, SG-1" />
        <p className="text-xs text-muted mt-1.5">
          Oddeľ čiarkou. Ak sa niektorý tag objaví v názve novinky, priradí sa automaticky ako "Súvisiaca novinka" na profile filmu — aj keď sa oficiálny názov filmu nezhoduje.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Typ</label>
        <select className="field-input" value={contentType} onChange={(e) => setContentType(e.target.value)}>
          {CONTENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <p className="text-xs text-muted mt-1.5">Dabing a titulky sa nastavujú hromadne v Administrácia → Lokalizácia.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Názov</label>
          <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={contentType === 'Seriál' ? 'Game of Thrones' : 'Odyssea'} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Originálny názov</label>
          <input className="field-input" value={originalTitle} onChange={(e) => setOriginalTitle(e.target.value)} placeholder={contentType === 'Seriál' ? 'Game of Thrones' : 'The Odyssey'} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Žánre (oddelené čiarkou)</label>
        <input className="field-input" value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Akčný, Dobrodružný, Dráma" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Krajina</label>
          <input className="field-input" value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="USA / Veľká Británia" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Rok</label>
          <input className="field-input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Dĺžka (min)</label>
          <input type="number" className="field-input" value={runtimeMinutes} onChange={(e) => setRuntimeMinutes(e.target.value)} placeholder="172" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Réžia</label>
          <input className="field-input" value={director} onChange={(e) => setDirector(e.target.value)} placeholder="Christopher Nolan" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Scenár</label>
          <input className="field-input" value={screenplay} onChange={(e) => setScreenplay(e.target.value)} placeholder="Christopher Nolan" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Kamera</label>
          <input className="field-input" value={cinematography} onChange={(e) => setCinematography(e.target.value)} placeholder="Hoyte van Hoytema" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Hudba</label>
          <input className="field-input" value={music} onChange={(e) => setMusic(e.target.value)} placeholder="Ludwig Göransson" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Hrajú (oddelené čiarkou)</label>
        <input className="field-input" value={cast} onChange={(e) => setCast(e.target.value)} placeholder="Matt Damon, Tom Holland, Anne Hathaway…" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Obsah / synopsis</label>
        <textarea className="field-input min-h-[140px]" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder={contentType === 'Seriál' ? 'O čom seriál je…' : 'O čom film je…'} />
      </div>

      {(!year || Number(year) >= 2026) && (
        <label className="flex items-center gap-2.5 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={nowShowing}
            onChange={(e) => setNowShowing(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <span className="text-sm font-semibold text-ink">V kinách teraz</span>
          <span className="text-xs text-muted">— zobrazí sa v pruhu hore na stránke</span>
        </label>
      )}

      {error && <div className="text-danger text-sm">{error}</div>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-dark disabled:opacity-50">
          {loading ? 'Ukladám…' : isEdit ? 'Uložiť zmeny' : 'Pridať film'}
        </button>
        <button type="button" onClick={() => router.back()} className="border border-line text-muted px-6 py-3 rounded-full text-sm font-semibold hover:text-ink hover:border-ink">
          Zrušiť
        </button>
      </div>
    </form>
  );
}
