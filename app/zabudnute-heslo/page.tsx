import { getDictionary, getUserLanguage } from '@/lib/i18n';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const dict = await getDictionary(await getUserLanguage());

  return (
    <div className="max-w-md mx-auto pt-10">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{dict['forgot.nadpis']}</h1>
      <p className="text-sm text-muted mb-8">{dict['forgot.popis']}</p>
      <ForgotPasswordForm />
    </div>
  );
}
