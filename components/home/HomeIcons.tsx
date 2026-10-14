// Ikonky novej hlavnej stránky (čiarové, 24×24).
const P: Record<string, string> = {
  fire: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.2 1.6 1 2.6 2.1 3.1C11 9.4 11 6 12 3Z',
  heart: 'M12 20.5s-7.5-4.6-9.2-9.3C1.7 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.4 3.5 4.3 6.7-1.7 4.7-9.2 9.3-9.2 9.3Z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
  news: 'M5 4.5h11a1.5 1.5 0 0 1 1.5 1.5v13H6.5A1.5 1.5 0 0 1 5 17.5Zm12.5 4h1.5V18a1 1 0 0 1-2 1M8 8.5h6M8 12h6M8 15.5h3',
  quote: 'M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6',
  user: 'M15.75 8.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.75 20a7.25 7.25 0 0 1 14.5 0',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  tv: 'M5 7.5h14A1.5 1.5 0 0 1 20.5 9v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V9A1.5 1.5 0 0 1 5 7.5Zm3.5-4 3.5 4 3.5-4',
  play: 'M7 4.5v15l13-7.5Z',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  arrow: 'M5 12h14m-5-5.5L19.5 12 14 17.5',
  thumb: 'M7 10v10H4V10Zm0 0 4.5-6.5a1.8 1.8 0 0 1 3.2 1.4L14 9h5a2 2 0 0 1 2 2.3l-1.2 6.6A2.5 2.5 0 0 1 17.3 20H7',
  chat: 'M20.5 12a8.5 8.5 0 0 1-12.6 7.45L3.5 20.5l1.05-4.3A8.5 8.5 0 1 1 20.5 12Z',
  cake: 'M4 20h16v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2Zm0-3c1.3 0 1.3-1 2.7-1s1.3 1 2.6 1 1.4-1 2.7-1 1.3 1 2.7 1 1.3-1 2.6-1 1.4 1 2.7 1M12 12V8m0-4c.8 1 .8 2 0 2.5-.8-.5-.8-1.5 0-2.5Z',
  x: 'M6 6l12 12M18 6 6 18'
};

export function HIcon({ name, className = 'w-[18px] h-[18px]', fill = false, sw = 1.9 }: { name: keyof typeof P | string; className?: string; fill?: boolean; sw?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] || ''} />
    </svg>
  );
}

export function scoreBg(p: number) {
  return p >= 70 ? '#059669' : p >= 20 ? '#2563EB' : '#15171A';
}

export function Score({ percent, big = false }: { percent: number | null | undefined; big?: boolean }) {
  if (percent === null || percent === undefined) return null;
  return (
    <span className={`ps-score ${big ? '!text-[13px] !px-[9px] !py-1' : ''}`} style={{ backgroundColor: scoreBg(percent) }}>
      {percent}%
    </span>
  );
}

export function GoldStars({ value, className = 'text-[13px]' }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={`tracking-[1px] ${className}`} aria-label={`${value}/5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ color: i < v ? '#F5B90B' : 'rgba(255,255,255,.25)' }}>
          ★
        </span>
      ))}
    </span>
  );
}
