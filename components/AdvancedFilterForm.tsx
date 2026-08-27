'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONTENT_TYPES, GENRES, COUNTRIES, YEARS, RATING_STEPS } from '@/lib/filterConstants';
import MultiSelectDropdown from './MultiSelectDropdown';
import { useT } from './TranslationProvider';

export default function AdvancedFilterForm() {
  const router = useRouter();
  const t = useT();

  const [types, setTypes] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [ratingFrom, setRatingFrom] = useState('');
  const [ratingTo, setRatingTo] = useState('');
  const [nowShowing, setNowShowing] = useState(false);
  const [hasReviews, setHasReviews] = useState(false);
  const [hasGallery, setHasGallery] = useState(false);
  const [hasVideos, setHasVideos] = useState(false);
  const [hasTrivia, setHasTrivia] = useState(false);
  const [actor, setActor] = useState('');
  const [director, setDirector] = useState('');
  const [screenplay, setScreenplay] = useState('');
  const [cinematography, setCinematography] = useState('');
  const [music, setMusic] = useState('');

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function reset() {
    setTypes([]);
    setSelectedGenres([]);
    setSelectedCountries([]);
    setYearFrom('');
    setYearTo('');
    setRatingFrom('');
    setRatingTo('');
    setNowShowing(false);
    setHasReviews(false);
    setHasGallery(false);
    setHasVideos(false);
    setHasTrivia(false);
    setActor('');
    setDirector('');
    setScreenplay('');
    setCinematography('');
    setMusic('');
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (types.length) params.set('types', types.join(','));
    if (selectedGenres.length) params.set('genres', selectedGenres.join(','));
    if (selectedCountries.length) params.set('countries', selectedCountries.join(','));
    if (yearFrom) params.set('yearFrom', yearFrom);
    if (yearTo) params.set('yearTo', yearTo);
    if (ratingFrom) params.set('ratingFrom', ratingFrom);
    if (ratingTo) params.set('ratingTo', ratingTo);
    if (nowShowing) params.set('nowShowing', '1');
    if (hasReviews) params.set('hasReviews', '1');
    if (hasGallery) params.set('hasGallery', '1');
    if (hasVideos) params.set('hasVideos', '1');
    if (hasTrivia) params.set('hasTrivia', '1');
    if (actor.trim()) params.set('actor', actor.trim());
    if (director.trim()) params.set('director', director.trim());
    if (screenplay.trim()) params.set('screenplay', screenplay.trim());
    if (cinematography.trim()) params.set('cinematography', cinematography.trim());
    if (music.trim()) params.set('music', music.trim());
    router.push(`/recenzie?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="border border-line border-t-0 rounded-b bg-card overflow-hidden">
      <div className="bg-surface px-4 py-2 border-b border-line">
        <h1 className="font-display font-bold text-sm text-ink">{t('filter.nadpis')}</h1>
      </div>

      <div className="p-4 grid md:grid-cols-[140px_1fr_1fr_190px] gap-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">{t('filter.typ')}</div>
          <div className="space-y-1">
            {CONTENT_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} className="w-3.5 h-3.5 accent-accent flex-none" />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">{t('filter.zaner')}</div>
            <MultiSelectDropdown label={t('filter.zaner_akuzativ')} options={GENRES} selected={selectedGenres} onChange={setSelectedGenres} />
          </div>

          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">{t('filter.rok')}</div>
            <div className="flex flex-col gap-1.5 max-w-[140px]">
              <select className="field-input-sm w-full" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)}>
                <option value="">{t('filter.od')}</option>
                {YEARS.slice().reverse().map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="field-input-sm w-full" value={yearTo} onChange={(e) => setYearTo(e.target.value)}>
                <option value="">{t('filter.do')}</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {(yearFrom || yearTo) && (
              <div className="text-[11px] text-accent font-semibold mt-1.5">
                {t('filter.vybrane')} {yearFrom || '1900'} – {yearTo || '2050'}
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">{t('filter.hodnotenie')}</div>
            <div className="flex flex-col gap-1.5 max-w-[140px]">
              <select className="field-input-sm w-full" value={ratingFrom} onChange={(e) => setRatingFrom(e.target.value)}>
                <option value="">{t('filter.od')}</option>
                {RATING_STEPS.map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
              <select className="field-input-sm w-full" value={ratingTo} onChange={(e) => setRatingTo(e.target.value)}>
                <option value="">{t('filter.do')}</option>
                {RATING_STEPS.slice().reverse().map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            {(ratingFrom || ratingTo) && (
              <div className="text-[11px] text-accent font-semibold mt-1.5">
                {t('filter.vybrane')} {ratingFrom || '0'}% – {ratingTo || '100'}%
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">{t('filter.povod')}</div>
            <MultiSelectDropdown label={t('filter.krajinu_akuzativ')} options={COUNTRIES} selected={selectedCountries} onChange={setSelectedCountries} />
          </div>

          <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">{t('filter.doplnujuce_filtre')}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
              <input type="checkbox" checked={nowShowing} onChange={(e) => setNowShowing(e.target.checked)} className="w-3.5 h-3.5 accent-accent flex-none" />
              {t('filter.bezi_v_kinach')}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
              <input type="checkbox" checked={hasReviews} onChange={(e) => setHasReviews(e.target.checked)} className="w-3.5 h-3.5 accent-accent flex-none" />
              {t('filter.s_recenziami')}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
              <input type="checkbox" checked={hasGallery} onChange={(e) => setHasGallery(e.target.checked)} className="w-3.5 h-3.5 accent-accent flex-none" />
              {t('filter.s_galeriou')}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
              <input type="checkbox" checked={hasVideos} onChange={(e) => setHasVideos(e.target.checked)} className="w-3.5 h-3.5 accent-accent flex-none" />
              {t('filter.s_videami')}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
              <input type="checkbox" checked={hasTrivia} onChange={(e) => setHasTrivia(e.target.checked)} className="w-3.5 h-3.5 accent-accent flex-none" />
              {t('filter.so_zaujimavostami')}
            </label>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">{t('filter.osoby')}</div>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] text-muted mb-0.5">{t('filter.herci')}</label>
              <input className="field-input-sm" value={actor} onChange={(e) => setActor(e.target.value)} placeholder={t('filter.herec_placeholder')} />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-0.5">{t('filter.reziseri')}</label>
              <input className="field-input-sm" value={director} onChange={(e) => setDirector(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-0.5">{t('filter.scenaristi')}</label>
              <input className="field-input-sm" value={screenplay} onChange={(e) => setScreenplay(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-0.5">{t('filter.kameramani')}</label>
              <input className="field-input-sm" value={cinematography} onChange={(e) => setCinematography(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-0.5">{t('filter.skladatelia')}</label>
              <input className="field-input-sm" value={music} onChange={(e) => setMusic(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface px-4 py-3 border-t border-line flex items-center justify-center gap-2.5">
        <button type="submit" className="bg-accent text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-accent-dark">
          {t('filter.hladat')}
        </button>
        <button type="button" onClick={reset} className="border border-line text-muted px-5 py-2 rounded-full text-xs font-semibold hover:text-ink hover:border-ink">
          {t('filter.resetovat')}
        </button>
      </div>
    </form>
  );
}
