'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IconUser } from './Icons';
import { ensureMyKeyPair, deriveSharedKey, decryptText } from '@/lib/e2ee';

type ConversationSummary = {
  user: { id: string; name: string; avatar: string | null; publicKey: string | null };
  lastBody: string | null;
  lastIv: string | null;
  lastIsImage: boolean;
  lastAt: Date | string;
  unread: number;
  lastMine: boolean;
  status: { status: string; initiatorId: string } | null;
};

export default function MessagesListClient({ conversations, myId }: { conversations: ConversationSummary[]; myId: string }) {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const results: Record<string, string> = {};
      for (const c of conversations) {
        if (c.lastIsImage) {
          results[c.user.id] = '📷 Fotka';
        } else if (c.lastBody && c.lastIv) {
          if (!c.user.publicKey) {
            results[c.user.id] = '🔒 Nová správa';
            continue;
          }
          try {
            const myPrivateKey = await ensureMyKeyPair(myId);
            const sharedKey = await deriveSharedKey(myPrivateKey, c.user.publicKey);
            results[c.user.id] = await decryptText(sharedKey, c.lastBody, c.lastIv);
          } catch {
            results[c.user.id] = '🔒 Nová správa';
          }
        } else {
          results[c.user.id] = c.lastBody || '';
        }
      }
      if (!cancelled) setPreviews(results);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [conversations]);

  return (
    <div className="space-y-1 -mx-4">
      {conversations.map((c) => (
        <Link
          key={c.user.id}
          href={`/messages/${c.user.id}`}
          className={`flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors ${c.unread > 0 ? 'bg-accent/5' : ''}`}
        >
          {c.user.avatar ? (
            <img src={c.user.avatar} alt={c.user.name} className="w-11 h-11 rounded-full object-cover flex-none" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-surface flex items-center justify-center flex-none">
              <IconUser className="w-5 h-5 text-muted" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-ink text-sm truncate">{c.user.name}</span>
              <span className="text-[11px] text-muted flex-none">
                {new Date(c.lastAt).toLocaleDateString('sk-SK', { timeZone: 'Europe/Bratislava' })}
              </span>
            </div>
            <p className="text-xs text-muted truncate">
              {c.status?.status === 'DECLINED' ? (
                <span className="text-danger">Zamietnuté</span>
              ) : c.status?.status === 'PENDING' && c.status.initiatorId === myId ? (
                <span className="text-amber-600">Čaká na potvrdenie</span>
              ) : c.status?.status === 'PENDING' ? (
                <span className="text-accent font-semibold">Chce s tebou komunikovať</span>
              ) : (
                <>
                  {c.lastMine && <span className="mr-1">✓✓</span>}
                  {previews[c.user.id] ?? '…'}
                </>
              )}
            </p>
          </div>
          {c.unread > 0 && (
            <span className="w-5 h-5 bg-accent text-white text-[11px] font-bold rounded-full flex items-center justify-center flex-none">
              {c.unread}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
