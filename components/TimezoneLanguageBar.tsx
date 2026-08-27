'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ThemeToggle from './ThemeToggle';
import { IconGlobe } from './Icons';
import { useT } from './TranslationProvider';

const COMMON_TIMEZONES = [
  'Europe/Bratislava', 'Europe/Prague', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Warsaw', 'Europe/Kyiv', 'Europe/Moscow', 'Europe/Madrid', 'Europe/Rome',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai', 'Australia/Sydney', 'UTC'
];

export default function TimezoneLanguageBar({ savedTimezone }: { savedTimezone: string | null }) {
  const t = useT();
  const { data: session } = useSession();
  const router = useRouter();

  const [detected, setDetected] = useState('');
  const [timezone, setTimezone] = useState(savedTimezone || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDetected(tz);
      if (!timezone) setTimezone(tz);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveTimezone(tz: string) {
    setTimezone(tz);
    if (!session) return;
    setSaving(true);
    try {
      await fetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: tz })
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const timezoneOptions = Array.from(new Set([timezone, detected, savedTimezone, ...COMMON_TIMEZONES].filter((x): x is string => Boolean(x))));
  const mismatch = detected && savedTimezone && detected !== savedTimezone;

  return (
    <div className="mt-4 border border-line rounded-xl bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-wrap">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted flex items-center gap-1">
          <IconGlobe className="w-3.5 h-3.5" />
          {t('home.vyber_pasma')}
        </span>
        <select
          className="field-input-sm w-auto min-w-[190px]"
          value={timezone}
          onChange={(e) => saveTimezone(e.target.value)}
          disabled={saving}
        >
          {timezoneOptions.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      {mismatch && (
        <div className="text-xs text-muted">
          {t('timezone.detekovali_sme')} <strong className="text-ink">{detected}</strong>.{' '}
          <button onClick={() => saveTimezone(detected)} className="text-accent font-semibold hover:underline">
            {t('timezone.zmenit_pasmo')}
          </button>
        </div>
      )}

      <div className="flex items-center gap-4 sm:ml-auto text-xs">
        <span className="text-muted">
          {t('timezone.jazyk_v_nastaveniach')}{' '}
          <Link href="/nastavenia" className="text-accent font-semibold hover:underline">Nastaveniach</Link>.
        </span>
        <span className="hidden sm:inline text-line">|</span>
        <div className="flex items-center gap-1.5 text-muted">
          <ThemeToggle />
          <span>{t('timezone.vzhlad')}</span>
        </div>
      </div>
    </div>
  );
}
