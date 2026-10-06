'use client';

export default function PrintButton({ label = 'Vytisknout / uložit jako PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark print:hidden"
    >
      {label}
    </button>
  );
}
