import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BulkAddPeopleForm from '@/components/BulkAddPeopleForm';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function BulkAddPeoplePage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  return (
    <div className="admin-page max-w-2xl">
      <AdminPageHeader title={<>Hromadné přidání osob</>} description={<>Zadej jména herců/tvůrců, jedno na řádek — max. 25 najednou. Systém pro každé jméno najde shodu na TMDb a automaticky vyplní fotku, životopis i data. Pokud osoba se stejným jménem už u nás existuje, automaticky se přeskočí.</>} />
      <BulkAddPeopleForm />
    </div>
  );
}
