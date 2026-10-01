// Jednotné vektorové ikony filtra (tenká linka, ako moderné filmové databázy).
const PATHS: Record<string, string> = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.6-3.6',
  sliders: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  sort: 'M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  shuffle: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  layers: 'M12 3 2 8l10 5 10-5-10-5zM2 13l10 5 10-5M2 17.5l10 5 10-5',
  x: 'M18 6 6 18M6 6l12 12',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  minus: 'M6 12h12',
  chevron: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  gem: 'M6 3h12l4 6-10 12L2 9zM2 9h20M12 21 8 9l4-6 4 6z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  ticket: 'M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 0 0-4V4H3zM14 4v16',
  play: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM10 8l6 4-6 4z',
  heart: 'M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6.5 5 5 0 0 1 21.2 11C19 15.6 12 20 12 20z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  tv: 'M3 6h18v12H3zM8 21h8M9 2l3 4 3-4',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  calendar: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
  star: 'M12 3l2.7 5.6 6.2.9-4.5 4.4 1 6.1L12 17.1 6.6 20l1-6.1L3.1 9.5l6.2-.9z',
  film: 'M4 3h16v18H4zM8 3v18M16 3v18M4 8h4M4 13h4M4 18h4M16 8h4M16 13h4M16 18h4'
};

export default function FilterIcon({ name, size = 18, className = '', strokeWidth = 1.8 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-none ${className}`}
      aria-hidden="true"
    >
      <path d={PATHS[name] || PATHS.film} />
    </svg>
  );
}
