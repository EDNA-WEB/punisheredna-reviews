'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatThemeCustomizer from './ChatThemeCustomizer';

export default function ChatHeaderActions({ otherId, otherName, initiallyBlocked }: { otherId: string; otherName: string; initiallyBlocked: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [loading, setLoading] = useState(false);

  async function deleteConversation() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/conversations/${otherId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/messages');
      router.refresh();
    } catch {
      alert('Zmazanie zlyhalo. Skús to prosím znova.');
      setDeleting(false);
    }
  }

  async function toggleBlock() {
    setLoading(true);
    try {
      const res = await fetch('/api/blocked-users', {
        method: blocked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: otherId })
      });
      if (!res.ok) throw new Error();
      setBlocked((v) => !v);
      setShowConfirm(false);
      router.refresh();
    } catch {
      alert('Akcia zlyhala. Skús to prosím znova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Ďalšie možnosti"
        className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-surface transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-line rounded-xl shadow-lg overflow-hidden z-40">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShowTheme(true);
              }}
              className="w-full text-left px-4 py-3 text-sm font-medium text-ink hover:bg-surface transition-colors border-b border-line"
            >
              🎨 Prispôsobiť vzhľad
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShowConfirm(true);
              }}
              className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-surface transition-colors border-b border-line ${blocked ? 'text-ink' : 'text-danger'}`}
            >
              {blocked ? 'Odblokovať používateľa' : 'Zablokovať používateľa'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShowDeleteConfirm(true);
              }}
              className="w-full text-left px-4 py-3 text-sm font-medium text-danger hover:bg-surface transition-colors"
            >
              🗑 Vymazať konverzáciu
            </button>
          </div>
        </>
      )}

      {showTheme && <ChatThemeCustomizer otherId={otherId} onClose={() => setShowTheme(false)} />}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-card border border-line rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-ink mb-2">Vymazať celú konverzáciu?</h3>
            <p className="text-sm text-muted mb-4">
              Zmažú sa všetky správy medzi tebou a {otherName}, u oboch. Táto akcia sa nedá vrátiť späť.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="text-sm font-semibold text-muted hover:text-ink px-4 py-2">
                Zrušiť
              </button>
              <button
                type="button"
                onClick={deleteConversation}
                disabled={deleting}
                className="text-sm font-semibold px-4 py-2 rounded-full text-white bg-danger hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? '…' : 'Vymazať'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-card border border-line rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-ink mb-2">
              {blocked ? `Odblokovať ${otherName}?` : `Zablokovať ${otherName}?`}
            </h3>
            <p className="text-sm text-muted mb-4">
              {blocked
                ? 'Táto osoba ti bude môcť opäť napísať a ty jej.'
                : 'Táto osoba ti už nebude môcť napísať a ani ty jej. Kedykoľvek to môžeš vrátiť späť.'}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowConfirm(false)} className="text-sm font-semibold text-muted hover:text-ink px-4 py-2">
                Zrušiť
              </button>
              <button
                type="button"
                onClick={toggleBlock}
                disabled={loading}
                className={`text-sm font-semibold px-4 py-2 rounded-full text-white disabled:opacity-50 ${
                  blocked ? 'bg-accent hover:bg-accent-dark' : 'bg-danger hover:opacity-90'
                }`}
              >
                {loading ? '…' : blocked ? 'Odblokovať' : 'Zablokovať'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
