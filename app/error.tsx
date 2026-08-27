'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="pt-20 pb-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-5">
        <span className="text-3xl">⚠️</span>
      </div>
      <h1 className="font-display font-extrabold text-2xl text-ink mb-2">Niečo sa pokazilo</h1>
      <p className="text-muted text-sm max-w-sm mb-8">
        Ospravedlňujeme sa, pri načítaní tejto stránky nastala neočakávaná chyba. Skús to prosím znova.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-dark transition-colors"
        >
          Skúsiť znova
        </button>
        <Link
          href="/"
          className="text-sm font-semibold text-ink border border-line px-5 py-2.5 rounded-full hover:border-accent hover:text-accent transition-colors"
        >
          Späť na hlavnú stránku
        </Link>
      </div>
    </div>
  );
}
