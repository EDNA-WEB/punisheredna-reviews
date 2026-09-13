export default function FlagGB({ className = 'w-5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={`${className} rounded-[2px] flex-none`} xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="14" fill="#00247D" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#FFFFFF" strokeWidth="2.8" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#CF142B" strokeWidth="1" />
      <path d="M10 0 V14 M0 7 H20" stroke="#FFFFFF" strokeWidth="4.6" />
      <path d="M10 0 V14 M0 7 H20" stroke="#CF142B" strokeWidth="2.6" />
    </svg>
  );
}
