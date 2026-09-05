import Link from 'next/link';
import BoxOfficeCompareTool from '@/components/BoxOfficeCompareTool';

export const dynamic = 'force-dynamic';

export default function BoxOfficeComparePage() {
  return (
    <div className="pt-8">
      <Link href="/box-office" className="text-xs text-accent hover:underline mb-2 inline-block">← Späť na Box Office</Link>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Porovnanie filmov</h1>
      <p className="text-muted mb-8">
        Vyber dva filmy a zisti, ktorý bol úspešnejší — vrátane prepočtu na dnešnú hodnotu peňazí, keďže filmy mohli vzniknúť v rôznych rokoch.
      </p>
      <BoxOfficeCompareTool />
    </div>
  );
}
