'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '../TranslationProvider';

const ShareIc = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5.5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="18.5" r="2.5" />
    <path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" />
  </svg>
);
const CheckIc = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

// Tlačidlá v úvodnej karte profilu: Sledovat / Napsat zprávu / Sdílet (alebo Upravit profil pri vlastnom).
export default function ProfileActions({
  userId,
  isOwn,
  canInteract,
  initialFollowing
}: {
  userId: string;
  isOwn: boolean;
  canInteract: boolean;
  initialFollowing: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: userId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setFollowing(!!data.following);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || t('profil.akce_selhala', 'Akce se nezdařila. Zkus to prosím znovu.'));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}/profile/${userId}`;
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
    <div className="flex flex-wrap items-center gap-2.5 mt-5">
      {isOwn ? (
        <Link href="/profile/edit" className="ap-chip ap-chip-red !px-[18px] !py-2.5 !text-[14px]">
          {t('profil.upravit_profil', 'Upravit profil')}
        </Link>
      ) : (
        canInteract && (
          <>
            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              className={`ap-chip !px-[18px] !py-2.5 !text-[14px] disabled:opacity-60 ${following ? 'ap-glass text-white' : 'ap-chip-red'}`}
            >
              {following ? (
                <>
                  <CheckIc />
                  {t('profil.sledujes', 'Sleduješ')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t('profil.sledovat', 'Sledovat')}
                </>
              )}
            </button>
            <Link href={`/messages/${userId}`} className="ap-chip ap-glass text-white !px-[18px] !py-2.5 !text-[14px] hover:bg-white/20">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
                <path d="m4.5 7 7.5 6 7.5-6" />
              </svg>
              {t('profil.napsat_zpravu', 'Napsat zprávu')}
            </Link>
          </>
        )
      )}
      <button
        type="button"
        onClick={share}
        className="ap-chip ap-glass text-white !px-3 !py-2.5 hover:bg-white/20"
        aria-label={t('profil.sdilet', 'Sdílet profil')}
        title={copied ? t('profil.zkopirovano', 'Odkaz zkopírován') : t('profil.sdilet', 'Sdílet profil')}
      >
        {copied ? <CheckIc /> : <ShareIc />}
      </button>
    </div>
  );
}
