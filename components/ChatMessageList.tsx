'use client';

import { useState, useEffect } from 'react';
import MessageImageReveal from './MessageImageReveal';
import ChatAutoScroll from './ChatAutoScroll';
import { ensureMyKeyPair, deriveSharedKey, decryptText } from '@/lib/e2ee';
import { getChatTheme } from '@/lib/chatTheme';

type RawMessage = {
  id: string;
  senderId: string;
  body: string | null;
  iv: string | null;
  image: string | null;
  imageViewedAt: Date | null;
  read: boolean;
  createdAt: string | Date;
};

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'DNES';
  if (date.toDateString() === yesterday.toDateString()) return 'VČERA';
  return date.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bratislava' });
}

export default function ChatMessageList({
  messages,
  myId,
  otherId,
  otherPublicKey
}: {
  messages: RawMessage[];
  myId: string;
  otherId: string;
  otherPublicKey: string | null;
}) {
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [bubbleColor, setBubbleColor] = useState('');

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
  const [keyError, setKeyError] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingSelection, setDeletingSelection] = useState(false);

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
    if (!confirm(`Zmazať ${selectedIds.size} vybraných správ? Zmiznú aj druhej strane.`)) return;
    setDeletingSelection(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => fetch(`/api/messages/${id}`, { method: 'DELETE' }))
      );
      setDeletedIds((prev) => new Set([...prev, ...selectedIds]));
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch {
      alert('Niektoré správy sa nepodarilo zmazať.');
    } finally {
      setDeletingSelection(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const results: Record<string, string> = {};
        const unencrypted = messages.filter((m) => m.body && !m.iv);
        const encrypted = messages.filter((m) => m.body && m.iv);

        // Staršie správy (pred zavedením šifrovania) alebo správy poslané, keď
        // druhá strana ešte nemala kľúč — sú uložené ako obyčajný text.
        for (const m of unencrypted) {
          results[m.id] = m.body!;
        }

        if (encrypted.length > 0) {
          if (!otherPublicKey) {
            setKeyError(true);
          } else {
            const myPrivateKey = await ensureMyKeyPair();
            const sharedKey = await deriveSharedKey(myPrivateKey, otherPublicKey);
            for (const m of encrypted) {
              try {
                results[m.id] = await decryptText(sharedKey, m.body!, m.iv!);
              } catch {
                results[m.id] = '⚠ Túto správu sa nepodarilo dešifrovať.';
              }
            }
          }
        } else {
          // Aj keď nie sú žiadne šifrované správy na dešifrovanie, zabezpečíme
          // aspoň, že toto zariadenie má svoj kľúč pripravený pre budúce správy.
          await ensureMyKeyPair().catch(() => {});
        }

        if (!cancelled) {
          setDecrypted(results);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setKeyError(true);
          setReady(true);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [messages, otherPublicKey]);

  if (!ready) {
    return <p className="text-muted text-sm text-center">Dešifrujem konverzáciu…</p>;
  }

  if (messages.length === 0) {
    return <p className="text-muted text-sm text-center">Zatiaľ žiadne správy. Napíš prvú.</p>;
  }

  let lastDay = '';

  return (
    <>
      {keyError && (
        <p className="text-xs text-amber-600 text-center mb-3">
          Druhá strana ešte nemá nastavené šifrovanie na svojom zariadení — text sa zobrazí, hneď ako si aspoň raz otvorí Poštu.
        </p>
      )}
      {messages
        .filter((m) => !deletedIds.has(m.id))
        .map((m) => {
        const mine = m.senderId === myId;
        const createdAt = new Date(m.createdAt);
        const thisDay = dayLabel(createdAt);
        const showDivider = thisDay !== lastDay;
        lastDay = thisDay;
        const canDelete = mine && !m.read && Date.now() - createdAt.getTime() < 30 * 60 * 1000;

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
              <div
                className={`max-w-[75%] rounded-xl px-4 py-2.5 ${mine ? 'text-white' : 'bg-surface text-ink'} ${mine && !bubbleColor ? 'bg-accent' : ''} ${
                  selectionMode && !canDelete ? 'opacity-50' : ''
                }`}
                style={mine && bubbleColor ? { backgroundColor: bubbleColor } : undefined}
              >
                {m.image && <MessageImageReveal messageId={m.id} mine={mine} alreadyViewed={!!m.imageViewedAt} />}
                {m.body && <p className="text-sm whitespace-pre-wrap leading-snug">{decrypted[m.id] ?? '…'}</p>}
                <div className={`flex items-center justify-end gap-1 mt-1 ${mine ? 'text-white/70' : 'text-muted'}`}>
                  <span className="text-[10px]">{createdAt.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' })}</span>
                  {mine && <span className={`text-[11px] ${m.read ? 'text-white' : 'text-white/60'}`}>✓✓</span>}
                </div>
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
              Zrušiť
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selectedIds.size === 0 || deletingSelection}
              className="text-sm font-semibold text-white bg-danger px-4 py-1.5 rounded-full hover:opacity-90 disabled:opacity-50"
            >
              {deletingSelection ? 'Mažem…' : `Zmazať vybrané (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}
      <ChatAutoScroll dep={messages.length} />
    </>
  );
}
