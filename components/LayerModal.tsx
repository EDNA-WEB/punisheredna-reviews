'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Modálne okno vykreslené priamo do <body> (portál) — nikdy ho neprekryjú
// ani neorežú prvky stránky (napr. úvod s isolation/overflow/backdrop-filter).
// Zatvára sa klávesou Esc, klikom mimo okna a krížikom; stránka pod ním neroluje.
export default function LayerModal({
  open,
  onClose,
  title,
  subtitle,
  closeLabel,
  maxWidth = 'max-w-5xl',
  children
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  closeLabel: string;
  maxWidth?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-3 sm:p-6"
      role="presentation"
      onClick={(e) => {
        // React posiela udalosti z portálu aj rodičom (napr. karte-odkazu) — tu sa zastavia
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-card text-ink rounded-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-2xl text-left`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-line px-5 sm:px-8 py-4 flex items-center justify-between gap-4 z-10">
          <div className="min-w-0">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-ink">{title}</h2>
            {subtitle ? <p className="text-sm text-muted truncate">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-surface transition-colors flex-none"
            aria-label={closeLabel}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
