import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="pt-20 pb-16 flex flex-col items-center text-center">
      <div className="font-display font-extrabold text-6xl text-line mb-4">404</div>
      <h1 className="font-display font-extrabold text-2xl text-ink mb-2">Stránka se nenašla</h1>
      <p className="text-muted text-sm max-w-sm mb-8">
        Odkaz, na který jsi klikl, buď neexistuje, nebo byl mezitím odstraněn.
      </p>
      <Link
        href="/"
        className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark transition-colors"
      >
        Zpět na hlavní stránku
      </Link>
    </div>
  );
}
