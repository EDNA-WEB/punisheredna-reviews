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
      <h1 className="font-display font-extrabold text-2xl text-ink mb-2">Hromadné přidání osob</h1>
      <p className="text-sm text-muted mb-6">
        Zadej jména herců/tvůrců, jedno na řádek — max. 25 najednou. Systém pro každé jméno najde shodu na TMDb a automaticky vyplní fotku, životopis i data. Pokud osoba se stejným jménem už u nás existuje, automaticky se přeskočí.
      </p>
      <BulkAddPeopleForm />
    </div>
  );
}
