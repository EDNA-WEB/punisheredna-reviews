import Link from 'next/link';
import AdvancedFilterForm from '@/components/AdvancedFilterForm';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export default async function AdvancedFilterPage() {
  const dict = await getDictionary(await getUserLanguage());
  return (
    <div className="pt-6">
      <div className="flex items-center gap-1 border-b border-line mb-0">
        <Link href="/recenzie/filter" className="text-sm font-semibold px-4 py-3 border-b-2 border-accent text-accent">
          {dict['filter.tab_filmy']}
        </Link>
        <Link href="/tvorcovia/filter" className="text-sm font-semibold px-4 py-3 border-b-2 border-transparent text-muted hover:text-ink">
          {dict['filter.tab_tvorcovia']}
        </Link>
      </div>

      <AdvancedFilterForm />
    </div>
  );
}
