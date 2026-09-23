import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
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

  const qrSession = await prisma.qrLoginSession.findUnique({ where: { id: params.id } });
  const isValid = qrSession && qrSession.status === 'pending' && qrSession.expiresAt > new Date();

  return (
    <div className="max-w-sm mx-auto pt-16 text-center">
      <div className="w-16 h-16 rounded-full bg-surface border border-line flex items-center justify-center mx-auto mb-5">
        <IconQrcode className="w-8 h-8 text-accent" />
      </div>
      {!isValid ? (
        <>
          <h1 className="font-display font-bold text-xl text-ink mb-2">Tento QR kód už neplatí</h1>
          <p className="text-sm text-muted">Vráť sa na prihlasovaciu stránku v druhom zariadení a naskenuj nový kód.</p>
        </>
      ) : (
        <>
          <h1 className="font-display font-bold text-xl text-ink mb-2">Prihlásiť sa v druhom zariadení?</h1>
          <p className="text-sm text-muted mb-6">
            Potvrdíš prihlásenie na účet <strong className="text-ink">{(session.user as any).name}</strong> na zariadení,
            čo naskenovalo tento kód.
          </p>
          <QrLoginConfirmButton id={params.id} />
        </>
      )}
    </div>
  );
}
