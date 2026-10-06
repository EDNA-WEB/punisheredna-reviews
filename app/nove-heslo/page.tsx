import Link from 'next/link';
import AuthCard from '@/components/email/AuthCard';
import { primaryButton } from '@/components/email/authStyles';
import NewPasswordForm from '@/components/email/NewPasswordForm';
import { findResetUser } from '@/lib/email/account';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// Nové heslo z odkazu v e-maile (/nove-heslo?token=…).
export default async function NewPasswordPage(props: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await props.searchParams;
  const dict = await getDictionary(await getUserLanguage());
  const t = (k: string, f: string) => dict[k] || f;
  const user = await findResetUser(token);

  if (!user) {
    return (
      <AuthCard icon="warn" title={t('email.vyprsal_nadpis', 'Odkaz vypršel')}>
        <p>{t('reset.vyprsal', 'Odkaz na nové heslo už neplatí nebo byl použit. Požádej si o nový.')}</p>
        <Link href="/obnoveni-hesla" className={`${primaryButton} block mt-6`}>
          {t('reset.novy_odkaz', 'Poslat nový odkaz')}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('email.nove_heslo', 'Nové heslo')}>
      <p>
        {t('reset.ucet', 'Účet')} <b className="text-white">{user.name}</b>
      </p>
      <NewPasswordForm token={token} />
    </AuthCard>
  );
}
