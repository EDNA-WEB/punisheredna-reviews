import Link from 'next/link';
import { IconEye } from '@/components/Icons';

export default function ThankYouPersonPage() {
  return (
    <div className="pt-16 max-w-md mx-auto text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5">
        <IconEye className="w-6 h-6" />
      </div>
      <h1 className="font-display font-extrabold text-2xl text-ink mb-3">Ďakujeme za návrh!</h1>
      <p className="text-muted mb-8">
        Osobu sme prijali a čaká na schválenie administrátorom. Kým ju schváli, ostatní návštevníci ju na webe neuvidia.
      </p>
      <Link href="/" className="text-accent font-semibold hover:underline">Späť na hlavnú stránku</Link>
    </div>
  );
}
