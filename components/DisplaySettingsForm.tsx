'use client';

import ThemeToggle from './ThemeToggle';
import { useT } from './TranslationProvider';

export default function DisplaySettingsForm() {
  const t = useT();
  return (
    <div className="max-w-md">
      <label className="block text-sm font-semibold text-ink mb-2">{t('settings.vzhlad')}</label>
      <div className="flex items-center gap-2.5 border border-line rounded-full pl-1.5 pr-4 py-1.5 w-fit">
        <ThemeToggle />
        <span className="text-sm text-ink">Tmavý / svetlý režim</span>
      </div>
    </div>
  );
}
