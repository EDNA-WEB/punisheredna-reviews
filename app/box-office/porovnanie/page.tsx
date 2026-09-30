import Link from 'next/link';
import BoxOfficeCompareTool from '@/components/BoxOfficeCompareTool';

export const dynamic = 'force-dynamic';

export default function BoxOfficeComparePage() {
  return (
    <div className="pt-8">
      <Link href="/box-office" className="text-xs text-accent hover:underline mb-2 inline-block">← Zpět na Box Office</Link>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Porovnání filmů</h1>
      <p className="text-muted mb-8">
        Vyber dva filmy a zjisti, který byl úspěšnější — včetně přepočtu na dnešní hodnotu peněz, protože filmy mohly vzniknout v různých letech.
      </p>
      <BoxOfficeCompareTool />
    </div>
  );
}
