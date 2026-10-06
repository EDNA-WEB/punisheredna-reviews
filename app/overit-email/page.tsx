import Link from 'next/link';
import AuthCard from '@/components/email/AuthCard';
import { primaryButton } from '@/components/email/authStyles';
import ResendVerificationButton from '@/components/email/ResendVerificationButton';
import { verifyEmailToken } from '@/lib/email/account';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// Overenie e-mailu z odkazu v e-maile (/overit-email?token=…).
export default async function VerifyEmailPage(props: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await props.searchParams;
  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;
  const result = await verifyEmailToken(token);

  if (result === 'ok' || result === 'already') {
    return (
      <AuthCard icon="ok" title={t('email.overeny_nadpis', 'E-mail ověřen')}>
        <p>{result === 'ok' ? t('email.overeny_text', 'Účet je aktivní. Vítej na KrálFilmu.cz.') : t('email.uz_overeny', 'Tento e-mail už je ověřený.')}</p>
        <Link href="/login" className={`${primaryButton} block mt-6`}>
          {t('auth.prihlasit', 'Přihlásit se')}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard icon="warn" title={t('email.vyprsal_nadpis', 'Odkaz vypršel')}>
      <p>{t('email.vyprsal_text', 'Tento odkaz už neplatí nebo byl použit. Pošli si nový, zabere to pár vteřin.')}</p>
      {result === 'expired' ? (
        <ResendVerificationButton token={token} primary initialWait={0} />
      ) : (
        <p className="mt-4 text-xs text-white/50">{t('email.vyprsal_prihlas', 'Nový odkaz si pošleš při pokusu o přihlášení.')}</p>
      )}
      <Link href="/login" className="text-accent text-xs font-semibold hover:underline inline-block mt-4">
        {t('email.spat_na_prihlasenie', 'Zpět na přihlášení')}
      </Link>
    </AuthCard>
  );
}
