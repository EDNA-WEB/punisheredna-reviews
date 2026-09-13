export default function FlagSK({ className = 'w-5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={`${className} rounded-[2px] flex-none`} xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="4.67" fill="#FFFFFF" />
      <rect y="4.67" width="20" height="4.67" fill="#0B4EA2" />
      <rect y="9.33" width="20" height="4.67" fill="#EE1C25" />
    </svg>
  );
}
