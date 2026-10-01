'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatAutoScroll from './ChatAutoScroll';
import { getChatTheme } from '@/lib/chatTheme';
import VoiceMessagePlayer, { type VoiceInfo } from './VoiceMessagePlayer';
import ChatPhotoLightbox from './ChatPhotoLightbox';

type RawMessage = {
  id: string;
  senderId: string;
  body: string | null;
  image: string | null;
  imageThumb?: string | null;
  photoExpired?: boolean;
  edited?: boolean;
  forwarded?: boolean;
  pinned?: boolean;
  replyTo?: { id: string; senderId?: string; kind?: string; text?: string; deleted?: boolean } | null;
  reactions?: Array<{ emoji: string; count: number; mine: boolean }>;
  imageViewedAt?: Date | null;
  voice?: VoiceInfo | null;
  read: boolean;
  createdAt: string | Date;
};

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'DNES';
  if (date.toDateString() === yesterday.toDateString()) return 'VČERA';
  return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bratislava' });
}

export default function ChatMessageList({ messages, myId, otherId }: { messages: RawMessage[]; myId: string; otherId: string }) {
  const [bubbleColor, setBubbleColor] = useState('');
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingSelection, setDeletingSelection] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const router = useRouter();

  async function toggleReaction(id: string, emoji: string) {
    await fetch(`/api/messages/${id}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji })
    }).catch(() => {});
    router.refresh();
  }

  function jumpTo(id: string) {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-accent');
    setTimeout(() => el.classList.remove('ring-2', 'ring-accent'), 1800);
  }

  useEffect(() => {
    setBubbleColor(getChatTheme(otherId).bubbleColor);
    function onThemeChange() {
      setBubbleColor(getChatTheme(otherId).bubbleColor);
    }
    window.addEventListener('storage', onThemeChange);
    window.addEventListener('chat-theme-changed', onThemeChange);
    return () => {
      window.removeEventListener('storage', onThemeChange);
      window.removeEventListener('chat-theme-changed', onThemeChange);
    };
  }, [otherId]);

  useEffect(() => {
    function onToggle() {
      setSelectionMode((v) => !v);
      setSelectedIds(new Set());
    }
    window.addEventListener('chat-selection-mode-toggle', onToggle);
    return () => window.removeEventListener('chat-selection-mode-toggle', onToggle);
  }, []);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Smazat ${selectedIds.size} vybraných zpráv? Zmizí tobě i druhé straně a nelze to vrátit.`)) return;
    setDeletingSelection(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/messages/${id}`, { method: 'DELETE' })));
      setDeletedIds((prev) => new Set([...prev, ...selectedIds]));
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch {
      alert('Některé zprávy se nepodařilo smazat.');
    } finally {
      setDeletingSelection(false);
    }
  }

  if (messages.length === 0) {
    return <p className="text-muted text-sm text-center">Zatím žádné zprávy. Napiš první.</p>;
  }

  let lastDay = '';

  return (
    <>
      {messages
        .filter((m) => !deletedIds.has(m.id))
        .map((m) => {
          const mine = m.senderId === myId;
          const createdAt = new Date(m.createdAt);
          const thisDay = dayLabel(createdAt);
          const showDivider = thisDay !== lastDay;
          lastDay = thisDay;
          const canDelete = mine; // vlastnú správu možno zmazať kedykoľvek, zmizne obom

          return (
            <div key={m.id}>
              {showDivider && (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] font-semibold text-muted bg-surface px-3 py-1 rounded-full">{thisDay}</span>
                </div>
              )}
              <div className={`flex items-center gap-1.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                {selectionMode && canDelete && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.id)}
                    onChange={() => toggleSelected(m.id)}
                    className="flex-none w-4 h-4 accent-accent cursor-pointer"
                  />
                )}
                <div className={`flex flex-col max-w-[75%] ${mine ? 'items-end' : 'items-start'}`}>
                <div
                  id={`msg-${m.id}`}
                  className={`rounded-xl px-4 py-2.5 transition-shadow ${mine ? 'text-white' : 'bg-surface text-ink'} ${mine && !bubbleColor ? 'bg-accent' : ''} ${
                    selectionMode && !canDelete ? 'opacity-50' : ''
                  }`}
                  style={mine && bubbleColor ? { backgroundColor: bubbleColor } : undefined}
                >
                  {m.forwarded && (
                    <div className={`text-[11px] italic mb-1 ${mine ? 'text-white/70' : 'text-muted'}`}>↪ Přeposláno</div>
                  )}
                  {m.replyTo && (
                    <button
                      type="button"
                      onClick={() => m.replyTo && !m.replyTo.deleted && jumpTo(m.replyTo.id)}
                      className={`block w-full text-left text-xs rounded-lg border-l-2 px-2 py-1 mb-1.5 ${
                        mine ? 'bg-black/15 border-white/60 text-white/85' : 'bg-line/50 border-accent text-muted'
                      }`}
                    >
                      {m.replyTo.deleted
                        ? 'Původní zpráva byla smazána'
                        : `${m.replyTo.senderId === myId ? 'Ty' : 'Odpověď'}: ${
                            m.replyTo.kind === 'voice' ? '🎤 Hlasová zpráva' : m.replyTo.kind === 'image' && !m.replyTo.text ? '📷 Fotka' : m.replyTo.text
                          }`}
                    </button>
                  )}
                  {m.voice ? (
                    <VoiceMessagePlayer id={m.id} mine={mine} voice={m.voice} />
                  ) : m.image ? (
                    <button type="button" onClick={() => setLightbox(m.image)} className="block mb-1.5 cursor-zoom-in" aria-label="Zvětšit fotku">
                      <img src={m.imageThumb || m.image} alt="Fotka" loading="lazy" className="rounded-xl max-h-64 max-w-full object-cover" />
                    </button>
                  ) : (
                    m.photoExpired && (
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1.5 ${mine ? 'bg-black/15' : 'bg-line/50'}`}>
                        <span className={`text-xs italic ${mine ? 'text-white/70' : 'text-muted'}`}>📷 Fotka vypršela</span>
                      </div>
                    )
                  )}
                  {m.body && <p className="text-sm whitespace-pre-wrap leading-snug">{m.body}</p>}
                  <div className={`flex items-center justify-end gap-1 mt-1 ${mine ? 'text-white/70' : 'text-muted'}`}>
                    <span className="text-[10px]">{createdAt.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' })}</span>
                    {m.pinned && <span className="text-[10px]" title="Připnuto">📌</span>}
                    {m.edited && <span className="text-[10px] italic">(upraveno)</span>}
                    {mine && <span className={`text-[11px] ${m.read ? 'text-white' : 'text-white/60'}`}>✓✓</span>}
                  </div>
                </div>
                {m.reactions && m.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {m.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        type="button"
                        onClick={() => toggleReaction(m.id, r.emoji)}
                        className={`text-xs rounded-full px-2 py-0.5 border transition-colors ${
                          r.mine ? 'border-accent bg-accent/15 text-ink' : 'border-line bg-surface text-muted hover:text-ink'
                        }`}
                      >
                        {r.emoji} {r.count}
                      </button>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>
          );
        })}
      {selectionMode && (
        <div className="sticky bottom-0 mt-3 flex items-center justify-between gap-3 bg-card border border-line rounded-xl px-4 py-3 shadow-lg">
          <span className="text-sm text-ink">
            {selectedIds.size === 0 ? 'Vyber správy na zmazanie' : `Vybraných: ${selectedIds.size}`}
          </span>
          <div className="flex items-center gap-2 flex-none">
            <button
              type="button"
              onClick={() => {
                setSelectionMode(false);
                setSelectedIds(new Set());
              }}
              className="text-sm font-semibold text-muted hover:text-ink px-3 py-1.5"
            >
              Zrušit
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selectedIds.size === 0 || deletingSelection}
              className="text-sm font-semibold text-white bg-danger px-4 py-1.5 rounded-full hover:opacity-90 disabled:opacity-50"
            >
              {deletingSelection ? 'Mažu…' : `Smazat vybrané (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}
      {lightbox && <ChatPhotoLightbox src={lightbox} onClose={() => setLightbox(null)} />}
      <ChatAutoScroll dep={messages.length} />
    </>
  );
}
