import { getDictionary, getUserLanguage } from '@/lib/i18n';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import AuthPageBackgroundOverride from '@/components/AuthPageBackgroundOverride';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const dict = await getDictionary(await getUserLanguage());

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <AuthPageBackgroundOverride />
      <div className="w-full max-w-md bg-black/55 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl p-8">
        <label className="block text-sm text-white/70 mb-1">{dict['forgot.nadpis']}</label>
        <p className="text-sm text-white/50 mb-6">{dict['forgot.popis']}</p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
