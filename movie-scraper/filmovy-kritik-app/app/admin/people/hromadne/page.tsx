import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BulkAddPeopleForm from '@/components/BulkAddPeopleForm';

export const dynamic = 'force-dynamic';

export default async function BulkAddPeoplePage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  return (
    <div className="pt-8 max-w-2xl">
      <h1 className="font-display font-extrabold text-2xl text-ink mb-2">Hromadné pridanie osôb</h1>
      <p className="text-sm text-muted mb-6">
        Zadaj mená hercov/tvorcov, jedno na riadok — max. 25 naraz. Systém pre každé meno nájde zhodu na TMDb a automaticky
        vyplní fotku, životopis aj dátumy. Ak osoba pod rovnakým menom už u nás existuje, automaticky sa preskočí.
      </p>
      <BulkAddPeopleForm />
    </div>
  );
}
