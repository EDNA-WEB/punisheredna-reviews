import Link from 'next/link';
import AuthCard from '@/components/email/AuthCard';
import ResendVerificationButton from '@/components/email/ResendVerificationButton';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// „Zkontroluj svůj e-mail“ — hneď po registrácii.
export default async function VerificationSentPage(props: { searchParams: Promise<{ n?: string; e?: string }> }) {
  const { n = '', e = '' } = await props.searchParams;
  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;
  const masked = e.slice(0, 120);

  return (
    <AuthCard icon="mail" title={t('email.skontroluj_nadpis', 'Zkontroluj svůj e-mail')}>
      <p>
        {masked ? (
          <>
            {t('email.poslali_sme_na', 'Na')} <b className="text-white">{masked}</b>{' '}
          </>
        ) : null}
        {t('email.poslali_sme_text', 'jsme poslali odkaz pro potvrzení účtu. Přihlásit se půjde až po kliknutí na něj.')}
      </p>
      <p className="text-xs text-white/50 mt-3">{t('email.skontroluj_spam', 'Nic nepřišlo? Podívej se i do složky Spam.')}</p>
      {n ? <ResendVerificationButton nickname={n.slice(0, 60)} /> : null}
      <Link href="/login" className="text-accent text-xs font-semibold hover:underline inline-block mt-4">
        {t('email.spat_na_prihlasenie', 'Zpět na přihlášení')}
      </Link>
    </AuthCard>
  );
}
