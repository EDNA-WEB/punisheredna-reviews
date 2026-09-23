import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getDictionary, getUserLanguage } from '@/lib/i18n';
import QrLoginConfirmButton from '@/components/QrLoginConfirmButton';
import { IconQrcode } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function QrLoginConfirmPage({ params }: { params: { id: string } }) {
  // Táto stránka sa otvorí na MOBILE po naskenovaní QR kódu — vďaka tomu, že
  // celý web vyžaduje prihlásenie, sem sa dostane len niekto, kto je už
  // prihlásený (presne to potrebujeme: potvrdiť prihlásenie za SEBA na
  // inom zariadení).
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/login?callbackUrl=/qr-prihlasenie/${params.id}`);

  const dict = await getDictionary(await getUserLanguage());
  const t = (key: string) => dict[key] || key;

  const qrSession = await prisma.qrLoginSession.findUnique({ where: { id: params.id } });
  const isValid = qrSession && qrSession.status === 'pending' && qrSession.expiresAt > new Date();

  return (
    <div className="max-w-sm mx-auto pt-16 text-center">
      <div className="w-16 h-16 rounded-full bg-surface border border-line flex items-center justify-center mx-auto mb-5">
        <IconQrcode className="w-8 h-8 text-accent" />
      </div>
      {!isValid ? (
        <>
          <h1 className="font-display font-bold text-xl text-ink mb-2">{t('auth.qr_uz_neplati')}</h1>
          <p className="text-sm text-muted">{t('auth.qr_vrat_sa')}</p>
        </>
      ) : (
        <>
          <h1 className="font-display font-bold text-xl text-ink mb-2">{t('auth.qr_prihlasit_v_druhom')}</h1>
          <p className="text-sm text-muted mb-6">
            {t('auth.qr_potvrdis_pred')} <strong className="text-ink">{(session.user as any).name}</strong>{' '}
            {t('auth.qr_potvrdis_po')}
          </p>
          <QrLoginConfirmButton id={params.id} />
        </>
      )}
    </div>
  );
}
