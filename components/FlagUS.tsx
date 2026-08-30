export default function FlagUS({ className = 'w-5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={`${className} rounded-[2px] flex-none`} xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="14" fill="#B22234" />
      {[0, 2, 4, 6, 8, 10, 12].map((y) => (
        <rect key={y} y={y} width="20" height="1.077" fill="#FFFFFF" />
      ))}
      <rect width="8" height="7.54" fill="#3C3B6E" />
    </svg>
  );
}
