import AuthCard from '@/components/email/AuthCard';
import ForgotPasswordEmailForm from '@/components/email/ForgotPasswordEmailForm';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// Zapomenuté heslo — odkaz na nové heslo e-mailom. Starší spôsob cez
// bezpečnostný kód ostáva na /zabudnute-heslo.
export default async function PasswordResetRequestPage() {
  const dict = await getDictionary(await getUserLanguage());
  return (
    <AuthCard icon="lock" title={dict['reset.nadpis'] || 'Zapomenuté heslo'}>
      <ForgotPasswordEmailForm />
    </AuthCard>
  );
}
