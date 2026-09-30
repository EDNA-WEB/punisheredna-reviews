// Jednotná sada ikon administrácie (tenké čiary, 20×20).
const P: Record<string, string> = {
  home: 'M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1z',
  check: 'M4 10.5 8 14.5 16 6',
  chart: 'M4 16V9M8.5 16V5M13 16v-5M17.5 16V7',
  bolt: 'M11 2 4 11.5h5L8 18l7-9.5h-5z',
  film: 'M3 5h14v10H3zM6 5v10M14 5v10M3 8.3h3M3 11.7h3M14 8.3h3M14 11.7h3',
  user: 'M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3.5 17.5a6.5 6.5 0 0 1 13 0',
  star: 'm10 2.8 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 8.1l5-.7z',
  news: 'M4 4h10v12H5a1 1 0 0 1-1-1zM14 7h2v8a1 1 0 0 1-2 0M6.5 7h5M6.5 10h5M6.5 13h3',
  play: 'M5 4v12l11-6z',
  calendar: 'M4 5h12v11H4zM4 8.5h12M7.5 3v3M12.5 3v3',
  tag: 'M3 10V4h6l8 8-6 6zM6.5 7h.01',
  tv: 'M3 5h14v9H3zM7.5 17h5M10 14v3',
  stream: 'M4 6h12M4 10h12M4 14h7',
  link: 'M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.8.8M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.8-.8',
  globe: 'M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM2.5 10h15M10 2.5c2 2 3 4.6 3 7.5s-1 5.5-3 7.5c-2-2-3-4.6-3-7.5s1-5.5 3-7.5z',
  bulb: 'M7.5 14.5h5M8 17h4M10 3a5 5 0 0 0-3 9c.6.5 1 1.3 1 2h4c0-.7.4-1.5 1-2a5 5 0 0 0-3-9z',
  users: 'M7.5 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 17a5.5 5.5 0 0 1 11 0M13.5 3.8a3 3 0 0 1 0 5.4M15.5 12.2A5.5 5.5 0 0 1 18 17',
  inbox: 'M3 11h4l1 2h4l1-2h4M3 11l2-7h10l2 7v5H3z',
  flag: 'M4 18V3M4 3h10l-2 3.5L14 10H4',
  bell: 'M5 14h10l-1.5-2V8.5a3.5 3.5 0 0 0-7 0V12zM8.5 16.5a1.5 1.5 0 0 0 3 0',
  ticket: 'M3 6h14v2.5a1.5 1.5 0 0 0 0 3V14H3v-2.5a1.5 1.5 0 0 0 0-3zM12 6v8',
  bag: 'M4 7h12l-1 10H5zM7.5 7V5.5a2.5 2.5 0 0 1 5 0V7',
  folder: 'M3 5h5l2 2h7v9H3z',
  brush: 'M13 3l4 4-6.5 6.5-4-4zM6.5 9.5 4 12c-1 1-1 3.5-1 5 1.5 0 4 0 5-1l2.5-2.5',
  translate: 'M3 4.5h8M7 3v1.5M5 4.5c.5 3 2.5 5.5 5 6.5M9 4.5c-.5 3-2.5 5.5-5 6.5M11 17l3-8 3 8M12 14.5h4',
  shield: 'M10 2.5 16 5v5c0 3.5-2.5 6.3-6 7.5-3.5-1.2-6-4-6-7.5V5z',
  list: 'M7 5h10M7 10h10M7 15h10M3.5 5h.01M3.5 10h.01M3.5 15h.01',
  cog: 'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM10 2v2M10 16v2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M2 10h2M16 10h2M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4',
  menu: 'M3 5h14M3 10h14M3 15h14',
  close: 'M5 5l10 10M15 5 5 15',
  search: 'M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM13.5 13.5 17 17',
  external: 'M11 3h6v6M17 3l-8 8M14 11v5H4V6h5',
  arrowUp: 'M10 16V4M5 9l5-5 5 5',
  arrowDown: 'M10 4v12M5 11l5 5 5-5',
  plus: 'M10 4v12M4 10h12',
  clock: 'M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM10 6v4l2.5 2.5'
};

export default function AdminIcon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={P[name] || P.list} />
    </svg>
  );
}
