import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function HboContestPage() {
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;

  return (
    <div className="pt-8 max-w-2xl mx-auto pb-16">
      <img src="/sutaz-hbo-banner.jpg" alt={t('sutaz.hbo_nadpis')} className="w-full rounded-xl mb-6" />

      <h1 className="font-display font-extrabold text-3xl text-ink mb-4">{t('sutaz.hbo_nadpis')}</h1>

      <div className="border border-line rounded-xl p-5 bg-card space-y-4 text-ink">
        <div>
          <h2 className="font-display font-bold text-lg mb-1">{t('sutaz.co_vyhrat')}</h2>
          <p className="text-sm">{t('sutaz.co_vyhrat_text')}</p>
        </div>

        <div>
          <h2 className="font-display font-bold text-lg mb-1">{t('sutaz.ako_sa_zapojit')}</h2>
          <p className="text-sm">{t('sutaz.podmienky_uvod')}</p>
          <ul className="text-sm list-disc pl-5 mt-2 space-y-1">
            <li>{t('sutaz.podmienka_clenstvo')}</li>
            <li>{t('sutaz.podmienka_registracia')}</li>
            <li>{t('sutaz.podmienka_recenzie')}</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display font-bold text-lg mb-1">{t('sutaz.termin')}</h2>
          <p className="text-sm">{t('sutaz.termin_text')}</p>
        </div>
      </div>
    </div>
  );
}
