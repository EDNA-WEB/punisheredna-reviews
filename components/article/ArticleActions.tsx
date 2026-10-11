'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '../TranslationProvider';
import { ApChat, ApCheck, ApLink, ApShare, ApThumb } from './ArticleIcons';

// Spoločný stav akcií článku (páči sa mi, kopírovanie odkazu, zdieľanie,
// priebeh čítania) — používa ho bočná lišta, karta na konci článku aj
// plávajúca lišta na mobile, takže sú vždy zosúladené.

type LikeState = { myValue: number; likeCount: number; dislikeCount: number };

type Ctx = {
  readOnly: boolean;
  likes: LikeState | null;
  canReact: boolean;
  busy: boolean;
  react: (value: 1 | -1) => void;
  commentCount: number | null;
  progress: number;
  copied: boolean;
  copyLink: () => void;
  share: () => void;
};

const ArticleCtx = createContext<Ctx | null>(null);

function useArticle(): Ctx {
  const c = useContext(ArticleCtx);
  if (!c) throw new Error('ArticleActionsProvider chýba');
  return c;
}

export function ArticleActionsProvider({
  readOnly,
  likes,
  canReact,
  likeTarget,
  commentCount,
  sharePath,
  title,
  children
}: {
  readOnly: boolean;
  likes: LikeState | null;
  canReact: boolean;
  likeTarget: { newsId?: string } | null;
  commentCount: number | null;
  sharePath: string | null;
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [likeState, setLikeState] = useState<LikeState | null>(likes);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setLikeState(likes), [likes?.myValue, likes?.likeCount, likes?.dislikeCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Priebeh čítania = koľko zo samotného textu článku (#ap-text, bez diskusie) už prešlo nad spodný okraj okna.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = document.getElementById('ap-text') || document.getElementById('ap-content');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const done = -rect.top + window.innerHeight * 0.4;
      const p = total <= 0 ? 1 : Math.min(1, Math.max(0, done / total));
      setProgress(Math.round(p * 100));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const react = useCallback(
    async (value: 1 | -1) => {
      if (readOnly || !canReact || !likeTarget || busy) return;
      setBusy(true);
      try {
        const res = await fetch('/api/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...likeTarget, value })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          if (res.status === 429 && data?.error) alert(data.error);
          return;
        }
        setLikeState({ myValue: data.myValue, likeCount: data.likeCount, dislikeCount: data.dislikeCount });
        router.refresh();
      } catch {
        /* sieťová chyba — stav ostáva */
      } finally {
        setBusy(false);
      }
    },
    [readOnly, canReact, likeTarget, busy, router]
  );

  const fullUrl = () => (sharePath ? `${window.location.origin}${sharePath}` : window.location.href);

  const copyLink = useCallback(async () => {
    if (readOnly) return;
    try {
      await navigator.clipboard.writeText(fullUrl());
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      /* schránka nedostupná */
    }
  }, [readOnly, sharePath]); // eslint-disable-line react-hooks/exhaustive-deps

  const share = useCallback(async () => {
    if (readOnly) return;
    const nav = navigator as Navigator & { share?: (d: { title?: string; url?: string }) => Promise<void> };
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title, url: fullUrl() });
        return;
      } catch {
        return; // používateľ zdieľanie zrušil
      }
    }
    copyLink();
  }, [readOnly, title, copyLink]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ArticleCtx.Provider
      value={{ readOnly, likes: likeState, canReact, busy, react, commentCount, progress, copied, copyLink, share }}
    >
      {children}
    </ArticleCtx.Provider>
  );
}

// Tenký pásik priebehu čítania úplne hore v okne.
export function ReadingProgressBar() {
  const { progress } = useArticle();
  return (
    <div className="ap-progress" aria-hidden="true">
      <div className="ap-progress-fill" style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  );
}

function ProgressRing({ size = 52 }: { size?: number }) {
  const { progress } = useArticle();
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }} aria-label={`${progress} %`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" className="ap-ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className="ap-ring-fill"
          strokeDasharray={c}
          strokeDashoffset={c - (c * progress) / 100}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11.5px] font-extrabold text-ink tabular-nums">{progress}%</div>
    </div>
  );
}

function scrollToComments() {
  document.getElementById('diskuze')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Ľavá „lepkavá“ lišta pri texte (od šírky lg).
export function ArticleRail() {
  const t = useT();
  const { readOnly, likes, canReact, busy, react, commentCount, copied, copyLink, share } = useArticle();
  const liked = likes?.myValue === 1;

  if (readOnly) {
    return (
      <div className="ap-rail">
        <ProgressRing />
        {likes && (
          <div className="ap-rail-static">
            <ApThumb className="w-[18px] h-[18px]" />
            <span>{likes.likeCount}</span>
          </div>
        )}
        {commentCount !== null && (
          <div className="ap-rail-static">
            <ApChat className="w-[18px] h-[18px]" />
            <span>{commentCount}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ap-rail">
      <ProgressRing />
      {likes && (
        <>
          <button
            type="button"
            onClick={() => react(1)}
            disabled={!canReact || busy}
            className={`ap-rail-btn ${liked ? 'is-active' : ''}`}
            aria-pressed={liked}
            aria-label={t('clanok.libi_se', 'Líbí se mi')}
            title={t('clanok.libi_se', 'Líbí se mi')}
          >
            <ApThumb className="w-[19px] h-[19px]" filled={liked} />
          </button>
          <div className="ap-rail-count">{likes.likeCount}</div>
        </>
      )}
      {commentCount !== null && (
        <>
          <button type="button" onClick={scrollToComments} className="ap-rail-btn" aria-label={t('clanok.diskuze', 'Diskuze')} title={t('clanok.diskuze', 'Diskuze')}>
            <ApChat className="w-[19px] h-[19px]" />
          </button>
          <div className="ap-rail-count">{commentCount}</div>
        </>
      )}
      <button type="button" onClick={copyLink} className={`ap-rail-btn ${copied ? 'is-ok' : ''}`} aria-label={t('clanok.kopirovat_odkaz', 'Kopírovat odkaz')} title={t('clanok.kopirovat_odkaz', 'Kopírovat odkaz')}>
        {copied ? <ApCheck className="w-[19px] h-[19px]" /> : <ApLink className="w-[19px] h-[19px]" />}
      </button>
      <div className="ap-rail-count">{copied ? t('clanok.zkopirovano', 'Zkopírováno') : t('clanok.odkaz', 'Odkaz')}</div>
      <button type="button" onClick={share} className="ap-rail-btn" aria-label={t('clanok.sdilet', 'Sdílet')} title={t('clanok.sdilet', 'Sdílet')}>
        <ApShare className="w-[19px] h-[19px]" />
      </button>
      <div className="ap-rail-count">{t('clanok.sdilet', 'Sdílet')}</div>
    </div>
  );
}

// Karta „Líbil se vám článek?“ na konci textu.
export function ArticleLikeCard() {
  const t = useT();
  const { readOnly, likes, canReact, busy, react, commentCount, copied, copyLink, share } = useArticle();
  const stats: string[] = [];
  if (likes) stats.push(`${t('clanok.pocet_libi', 'Líbí se')}: ${likes.likeCount}`);
  if (commentCount !== null) stats.push(`${t('clanok.pocet_komentaru', 'Komentáře')}: ${commentCount}`);

  const heading = likes ? t('clanok.libil_se_clanek', 'Líbil se vám článek?') : t('clanok.sdilejte', 'Sdílejte článek');

  if (readOnly) {
    if (!likes && commentCount === null) return null;
    return (
      <div className="ap-card ap-like-card">
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-[17px] text-ink">{t('clanok.libil_se_clanek', 'Líbil se vám článek?')}</div>
          <div className="text-[13.5px] text-muted mt-0.5">{t('clanok.jen_prihlaseni', 'Komentovat a hodnotit mohou jen přihlášení čtenáři KrálFilmu.cz.')}</div>
        </div>
        {stats.length > 0 && <div className="text-[13px] font-semibold text-muted">{stats.join(' · ')}</div>}
      </div>
    );
  }

  const liked = likes?.myValue === 1;
  const disliked = likes?.myValue === -1;
  return (
    <div className="ap-card ap-like-card">
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-[17px] text-ink">{heading}</div>
        {stats.length > 0 && <div className="text-[13.5px] text-muted mt-0.5">{stats.join(' · ')}</div>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {likes && canReact && (
          <>
            <button type="button" onClick={() => react(1)} disabled={busy} className={`ap-pill ${liked ? 'is-dark' : ''}`} aria-pressed={liked}>
              <ApThumb className="w-[17px] h-[17px]" filled={liked} />
              {t('clanok.libi_se', 'Líbí se mi')}
            </button>
            <button
              type="button"
              onClick={() => react(-1)}
              disabled={busy}
              className={`ap-pill ap-pill-icon ${disliked ? 'is-dark' : ''}`}
              aria-pressed={disliked}
              aria-label={t('clanok.nelibi_se', 'Nelíbí se mi')}
              title={t('clanok.nelibi_se', 'Nelíbí se mi')}
            >
              <ApThumb className="w-[17px] h-[17px]" down filled={disliked} />
            </button>
            <span className="w-px h-7 bg-line mx-1 hidden sm:block" aria-hidden="true" />
          </>
        )}
        <button
          type="button"
          onClick={copyLink}
          className={`ap-pill ap-pill-icon ${copied ? 'is-ok' : ''}`}
          aria-label={t('clanok.kopirovat_odkaz', 'Kopírovat odkaz')}
          title={copied ? t('clanok.zkopirovano', 'Zkopírováno') : t('clanok.kopirovat_odkaz', 'Kopírovat odkaz')}
        >
          {copied ? <ApCheck className="w-[17px] h-[17px]" /> : <ApLink className="w-[17px] h-[17px]" />}
        </button>
        <button type="button" onClick={share} className="ap-pill">
          <ApShare className="w-[17px] h-[17px]" />
          {t('clanok.sdilet', 'Sdílet')}
        </button>
      </div>
    </div>
  );
}

// Plávajúca lišta akcií na mobile (pod šírkou lg). Na zdieľanej verzii sa nezobrazuje.
export function MobileActionBar() {
  const t = useT();
  const { readOnly, likes, canReact, busy, react, commentCount, copied, copyLink, share, progress } = useArticle();
  if (readOnly) return null;
  const liked = likes?.myValue === 1;
  return (
    <div className="ap-mobile-bar lg:hidden" role="toolbar" aria-label={t('clanok.akce', 'Akce článku')}>
      <div className="ap-mobile-progress" style={{ transform: `scaleX(${progress / 100})` }} aria-hidden="true" />
      {likes && (
        <button type="button" onClick={() => react(1)} disabled={!canReact || busy} className={liked ? 'is-active' : ''} aria-pressed={liked}>
          <ApThumb className="w-5 h-5" filled={liked} />
          <span>{likes.likeCount}</span>
        </button>
      )}
      {commentCount !== null && (
        <button type="button" onClick={scrollToComments}>
          <ApChat className="w-5 h-5" />
          <span>{commentCount}</span>
        </button>
      )}
      <button type="button" onClick={copyLink} className={copied ? 'is-ok' : ''}>
        {copied ? <ApCheck className="w-5 h-5" /> : <ApLink className="w-5 h-5" />}
        <span>{copied ? t('clanok.zkopirovano', 'Zkopírováno') : t('clanok.odkaz', 'Odkaz')}</span>
      </button>
      <button type="button" onClick={share}>
        <ApShare className="w-5 h-5" />
        <span>{t('clanok.sdilet', 'Sdílet')}</span>
      </button>
    </div>
  );
}
