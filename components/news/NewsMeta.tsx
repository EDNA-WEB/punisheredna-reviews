'use client';

import { useT } from '../TranslationProvider';

// Riadok pod článkom v rubrike Novinky: „před 2 h · 4 min · 48 komentářov“.
function ago(iso: string, t: (k: string, f?: string) => string) {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return t('news2.pred_min', 'před {0} min').replace('{0}', String(min));
  const h = Math.round(min / 60);
  if (h < 24) return t('news2.pred_h', 'před {0} h').replace('{0}', String(h));
  const d = new Date(iso);
  const time = d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' });
  if (h < 48) return `${t('news2.vcera', 'včera')} ${time}`;
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Europe/Prague' });
}

export default function NewsMeta({ createdAt, minutes, comments, dark = false }: { createdAt: string; minutes: number; comments: number; dark?: boolean }) {
  const t = useT();
  const c = dark ? 'text-white/60' : 'text-muted';
  return (
    <div className={`flex items-center gap-3 text-[12.5px] ${c}`}>
      <span suppressHydrationWarning>{ago(createdAt, t)}</span>
      <span className="flex items-center gap-1" title={t('news2.cteni', 'Doba čtení')}>
        <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
        {t('news2.min', '{0} min').replace('{0}', String(minutes))}
      </span>
      <span className="flex items-center gap-1" title={t('news2.komentare', 'Komentáře')}>
        <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true">
          <path d="M20.5 12a8.5 8.5 0 0 1-12.6 7.45L3.5 20.5l1.05-4.3A8.5 8.5 0 1 1 20.5 12Z" />
        </svg>
        {comments}
      </span>
    </div>
  );
}
