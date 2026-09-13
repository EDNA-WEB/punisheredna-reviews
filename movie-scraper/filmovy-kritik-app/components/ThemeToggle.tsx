'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconSun, IconMoon } from './Icons';
import { useT } from './TranslationProvider';
import { hasClientConsent } from '@/lib/clientConsent';

export default function ThemeToggle({ variant = 'default' }: { variant?: 'default' | 'menu' }) {
  const t = useT();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    // Ak používateľ vypol "Uloženie preferencií", téma sa použije len pre
    // túto reláciu (do zatvorenia prehliadača), ale neuloží sa natrvalo.
    if (hasClientConsent('preferences')) {
      document.cookie = `theme=${next ? 'dark' : 'light'}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      document.cookie = `theme=${next ? 'dark' : 'light'}; path=/; SameSite=Lax`;
    }
    router.refresh();
  }

  if (variant === 'menu') {
    return (
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface text-left"
      >
        {isDark ? <IconSun className="w-4 h-4 text-muted" /> : <IconMoon className="w-4 h-4 text-muted" />}
        {isDark ? t('settings.svetly_rezim') : t('settings.tmavy_rezim')}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Prepnúť na svetlý vzhľad' : 'Prepnúť na tmavý vzhľad'}
      title={isDark ? 'Prepnúť na svetlý vzhľad' : 'Prepnúť na tmavý vzhľad'}
      className="w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-surface transition-colors"
    >
      {isDark ? <IconSun className="w-3.5 h-3.5" /> : <IconMoon className="w-3.5 h-3.5" />}
    </button>
  );
}
