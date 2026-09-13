export default function Logo({ className = 'h-20 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 200" className={className} role="img" aria-label="PunisherEDNA reviews">
      {/* Odznak s lebkou — vlastné tmavé pozadie, funguje rovnako v oboch režimoch */}
      <g transform="translate(10,10)">
        <rect x="0" y="0" width="180" height="180" rx="42" fill="#15171A" />
        <rect x="1.5" y="1.5" width="177" height="177" rx="41" fill="none" stroke="#E3141F" strokeWidth="2" opacity="0.55" />

        <g fill="#F4F4F5">
          <path d="M90 26
                   C 128 26, 152 54, 152 88
                   C 152 108, 143 122, 133 132
                   L 133 150
                   C 133 158, 122 158, 121 150
                   L 118 136
                   L 104 136
                   L 103 151
                   C 102.5 159, 90.5 159, 90 151
                   L 90 136
                   L 76 136
                   L 75 151
                   C 74.5 159, 62.5 159, 62 151
                   L 59 136
                   L 47 136
                   L 47 132
                   C 37 122, 28 108, 28 88
                   C 28 54, 52 26, 90 26 Z" />
        </g>

        <ellipse cx="66" cy="80" rx="17" ry="21" fill="#15171A" />
        <ellipse cx="114" cy="80" rx="17" ry="21" fill="#15171A" />
        <path d="M90 96 L80 118 C80 124, 100 124, 100 118 Z" fill="#15171A" />

        <line x1="76" y1="136" x2="75.4" y2="151" stroke="#15171A" strokeWidth="2.5" />
        <line x1="90" y1="136" x2="90" y2="152" stroke="#15171A" strokeWidth="2.5" />
        <line x1="104" y1="136" x2="104.6" y2="151" stroke="#15171A" strokeWidth="2.5" />

        <path d="M112 40 L120 58 L113 64 L122 84" fill="none" stroke="#E3141F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Nápis — farba sa prispôsobí svetlému/tmavému režimu cez CSS premenné webu */}
      <g fontFamily="Arial, Helvetica, sans-serif">
        <text x="212" y="98" fontSize="46" fontWeight="800" letterSpacing="0.5" style={{ fill: 'var(--color-ink)' }}>
          PUNISHER<tspan fill="#E3141F">EDNA</tspan>
        </text>
        <text x="213" y="128" fontSize="20" fontWeight="600" letterSpacing="6" style={{ fill: 'var(--color-muted)' }}>
          REVIEWS
        </text>
      </g>
    </svg>
  );
}
