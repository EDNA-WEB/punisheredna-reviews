export default function FlagWorld({ className = 'w-5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={`${className} flex-none`} xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="7" r="6" fill="#EDECEA" stroke="#B8B6B2" strokeWidth="0.6" />
      <path
        d="M4 7h12M10 1c2 1.6 3 3.6 3 6s-1 4.4-3 6c-2-1.6-3-3.6-3-6s1-4.4 3-6Z"
        fill="none"
        stroke="#B8B6B2"
        strokeWidth="0.6"
      />
      <path d="M5.2 4h9.6M5.2 10h9.6" stroke="#B8B6B2" strokeWidth="0.5" fill="none" />
    </svg>
  );
}
