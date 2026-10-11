import { prisma } from '@/lib/prisma';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import PublicContactForm from '@/components/PublicContactForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: 'Provozovatel a kontakt' };
}

// Verejná stránka (aj bez prihlásenia): údaje o prevádzkovateľovi a kontakt
// pre používateľov, úrady a žiadosti o ochranu osobných údajov.
export default async function OperatorPage() {
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string, fallback: string) => dict[key] || fallback;
  const s = await prisma.settings.findUnique({
    where: { id: 'singleton' },
    select: { operatorName: true, operatorCompanyId: true, operatorAddress: true, operatorEmail: true }
  });
  const rows = [
    [t('operator.provozovatel', 'Provozovatel'), s?.operatorName],
    [t('operator.ico', 'IČO'), s?.operatorCompanyId],
    [t('operator.adresa', 'Sídlo / adresa'), s?.operatorAddress],
    [t('operator.email', 'E-mail'), s?.operatorEmail]
  ].filter(([, v]) => !!v) as [string, string][];

  return (
    <div className="my-8 max-w-2xl w-full bg-card border border-line rounded-xl p-6 sm:p-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-1">{t('operator.nadpis', 'Provozovatel a kontakt')}</h1>
      <p className="text-sm text-muted mb-6">{t('operator.popis', 'Údaje o provozovateli, kontakt pro uživatele, úřady a žádosti o ochranu osobních údajů.')}</p>

      {rows.length > 0 && (
        <div className="border-t border-line mb-8">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col sm:flex-row gap-1 sm:gap-0 py-2.5 border-b border-line text-sm">
              <div className="sm:w-52 text-muted flex-none">{label}</div>
              <div className="text-ink font-medium break-words">
                {label === t('operator.email', 'E-mail') ? (
                  <a href={`mailto:${value}`} className="text-accent font-semibold hover:underline">{value}</a>
                ) : (
                  value
                )}
              </div>
            </div>
          ))}
          {s?.operatorEmail && (
            <div className="flex flex-col sm:flex-row gap-1 sm:gap-0 py-2.5 border-b border-line text-sm">
              <div className="sm:w-52 text-muted flex-none">{t('operator.dsa', 'Kontaktní místo (DSA)')}</div>
              <div className="text-ink">{t('operator.dsa_text', 'e-mail výše · čeština, slovenština, angličtina')}</div>
            </div>
          )}
        </div>
      )}

      <h2 className="font-display font-bold text-lg text-ink">{t('operator.napis_nam', 'Napiš nám')}</h2>
      <p className="text-sm text-muted mb-4">{t('operator.napis_popis', 'Funguje i bez přihlášení — nahlášení obsahu, žádost o údaje, dotaz.')}</p>
      <PublicContactForm />
    </div>
  );
}
