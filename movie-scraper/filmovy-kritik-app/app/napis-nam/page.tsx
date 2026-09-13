import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ContactForm from '@/components/ContactForm';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const session = await getServerSession(authOptions);
  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;

  if (!session) {
    return (
      <div className="pt-10 max-w-sm">
        <h1 className="font-display font-extrabold text-2xl text-ink mb-2">{t('contact.nadpis')}</h1>
        <p className="text-sm text-muted mb-5">{t('contact.musis_byt_prihlaseny')}</p>
        <Link href="/login" className="inline-block bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark">
          {t('auth.prihlasit')}
        </Link>
      </div>
    );
  }

  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { name: true } });

  return (
    <div className="pt-8 max-w-md">
      <ContactForm nickname={user?.name || ''} />

      <div className="mt-4 border border-line rounded-xl bg-surface p-4 text-xs text-muted leading-relaxed space-y-2">
        <p className="font-semibold text-ink">{t('contact.info_nadpis')}</p>
        <p>{t('contact.info_text1')}</p>
        <p>{t('contact.info_limit')}</p>
      </div>
    </div>
  );
}
