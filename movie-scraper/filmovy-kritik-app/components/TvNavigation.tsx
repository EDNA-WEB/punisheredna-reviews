'use client';

import { useEffect } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isTextEditingElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['button', 'submit', 'checkbox', 'radio', 'range', 'file', 'reset'].includes(type);
  }
  return (el as HTMLElement).isContentEditable;
}

function isVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// Nájde najbližší zaostriteľný prvok v smere šípky, od aktuálne zaostreného.
// Ide o jednoduchú, ale spoľahlivú priestorovú navigáciu — bez potreby upravovať
// jednotlivé stránky, funguje naprieč celým webom automaticky.
function findNextFocusTarget(direction: 'up' | 'down' | 'left' | 'right'): HTMLElement | null {
  const current = document.activeElement as HTMLElement | null;
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
  if (candidates.length === 0) return null;

  if (!current || current === document.body) {
    // Nič nie je zaostrené — začneme od prvého viditeľného prvku zhora.
    return candidates.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
  }

  const curRect = current.getBoundingClientRect();
  const curCenter = { x: curRect.left + curRect.width / 2, y: curRect.top + curRect.height / 2 };

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of candidates) {
    if (el === current) continue;
    const rect = el.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const dx = center.x - curCenter.x;
    const dy = center.y - curCenter.y;

    let primary: number;
    let perpendicular: number;
    if (direction === 'right') {
      if (dx <= 0) continue;
      primary = dx;
      perpendicular = Math.abs(dy);
    } else if (direction === 'left') {
      if (dx >= 0) continue;
      primary = -dx;
      perpendicular = Math.abs(dy);
    } else if (direction === 'down') {
      if (dy <= 0) continue;
      primary = dy;
      perpendicular = Math.abs(dx);
    } else {
      if (dy >= 0) continue;
      primary = -dy;
      perpendicular = Math.abs(dx);
    }

    // Uprednostníme prvky čo najbližšie v smere šípky, s miernou penalizáciou za
    // bočné odchýlenie — takto sa navigácia po mriežke plagátov správa prirodzene.
    const score = primary + perpendicular * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best;
}

export default function TvNavigation() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      // V textových poliach necháme šípky fungovať normálne (pohyb kurzora, výber
      // v rozbaľovacom zozname a pod.) — nezasahujeme.
      if (isTextEditingElement(active)) return;

      let direction: 'up' | 'down' | 'left' | 'right' | null = null;
      if (e.key === 'ArrowUp') direction = 'up';
      else if (e.key === 'ArrowDown') direction = 'down';
      else if (e.key === 'ArrowLeft') direction = 'left';
      else if (e.key === 'ArrowRight') direction = 'right';
      if (!direction) return;

      const next = findNextFocusTarget(direction);
      if (next) {
        e.preventDefault();
        next.focus();
        next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return null;
}
