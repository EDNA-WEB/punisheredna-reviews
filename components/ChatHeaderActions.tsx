'use client';

function notReady() {
  alert('Táto funkcia zatiaľ nie je dostupná.');
}

export default function ChatHeaderActions() {
  return (
    <div className="flex items-center gap-1 flex-none">
      <button type="button" onClick={notReady} title="Videohovor" className="w-9 h-9 rounded-full flex items-center justify-center text-[#aebac1] hover:text-white hover:bg-white/5 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </button>
      <button type="button" onClick={notReady} title="Hlasový hovor" className="w-9 h-9 rounded-full flex items-center justify-center text-[#aebac1] hover:text-white hover:bg-white/5 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </button>
      <button type="button" onClick={notReady} title="Hľadať v správach" className="w-9 h-9 rounded-full flex items-center justify-center text-[#aebac1] hover:text-white hover:bg-white/5 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
      <button type="button" onClick={notReady} title="Ďalšie možnosti" className="w-9 h-9 rounded-full flex items-center justify-center text-[#aebac1] hover:text-white hover:bg-white/5 transition-colors">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
    </div>
  );
}
