// Ikony nového zobrazenia článku — rovnaký štýl ako components/Icons.tsx
// (obrys 1.75, zaoblené konce), aby boli ostré a jednotné.
type P = { className?: string };

function Svg({ className = 'w-5 h-5', children, fill = 'none' }: P & { children: React.ReactNode; fill?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function ApThumb({ className, filled = false, down = false }: P & { filled?: boolean; down?: boolean }) {
  return (
    <Svg className={`${className || 'w-5 h-5'}${down ? ' -scale-y-100' : ''}`} fill={filled ? 'currentColor' : 'none'}>
      <path d="M7 10v10H4V10Zm0 0 4.5-6.5a1.8 1.8 0 0 1 3.2 1.4L14 9h5a2 2 0 0 1 2 2.3l-1.2 6.6A2.5 2.5 0 0 1 17.3 20H7" />
    </Svg>
  );
}

export function ApChat({ className }: P) {
  return (
    <Svg className={className}>
      <path d="M20.5 12a8.5 8.5 0 0 1-12.6 7.45L3.5 20.5l1.05-4.3A8.5 8.5 0 1 1 20.5 12Z" />
    </Svg>
  );
}

export function ApShare({ className }: P) {
  return (
    <Svg className={className}>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" />
    </Svg>
  );
}

export function ApLink({ className }: P) {
  return (
    <Svg className={className}>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </Svg>
  );
}

export function ApCheck({ className }: P) {
  return (
    <Svg className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function ApClock({ className }: P) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function ApPlay({ className = 'w-4 h-4' }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.75v12.5L18.25 12Z" />
    </svg>
  );
}

export function ApArrow({ className }: P) {
  return (
    <Svg className={className}>
      <path d="M5 12h14m-5-5.5L19.5 12 14 17.5" />
    </Svg>
  );
}

export function ApUser({ className }: P) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
    </Svg>
  );
}
