export default function FlagCZ({ className = 'w-5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={`${className} rounded-[2px] flex-none`} xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="14" fill="#FFFFFF" />
      <rect width="20" height="7" y="7" fill="#D7141A" />
      <path d="M0 0 L10 7 L0 14 Z" fill="#11457E" />
    </svg>
  );
}
