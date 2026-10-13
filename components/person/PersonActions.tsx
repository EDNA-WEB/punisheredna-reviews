'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '../TranslationProvider';

// Tlačidlo „Přidat do oblíbených“ a „Sdílet“ v úvode profilu osobnosti.
export function PersonFollow({ personId, initialFollowing }: { personId: string; initialFollowing: boolean }) {
  const t = useT();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/people/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setFollowing(!!data.following);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || t('osoba.akce_selhala', 'Akce se nezdařila. Zkus to prosím znovu.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`ap-chip !px-[18px] !py-2.5 !text-[14px] disabled:opacity-60 ${following ? 'ap-glass text-white' : 'ap-chip-red'}`}
      aria-pressed={following}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={following ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-9.2-9.3C1.7 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.4 3.5 4.3 6.7-1.7 4.7-9.2 9.3-9.2 9.3Z" />
      </svg>
      {following ? t('osoba.v_oblibenych', 'V oblíbených') : t('osoba.pridat_do_oblibenych', 'Přidat do oblíbených')}
    </button>
  );
}

export function PersonShare({ slug }: { slug: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${window.location.origin}/osobnost/${slug}`;
    const nav = navigator as Navigator & { share?: (d: { url?: string; title?: string }) => Promise<void> };
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ url, title: document.title });
      } catch {
        /* zrušené */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* schránka nedostupná */
    }
  }
  return (
    <button type="button" onClick={share} className="ap-chip ap-glass text-white !px-3 !py-2.5 hover:bg-white/20" aria-label={t('osoba.sdilet', 'Sdílet')} title={copied ? t('osoba.zkopirovano', 'Odkaz zkopírován') : t('osoba.sdilet', 'Sdílet')}>
      {copied ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5.5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="18.5" r="2.5" />
          <path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" />
        </svg>
      )}
    </button>
  );
}
