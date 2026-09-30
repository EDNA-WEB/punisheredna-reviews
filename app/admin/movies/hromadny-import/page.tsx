import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BulkTmdbImportForm from '@/components/BulkTmdbImportForm';

export default async function BulkImportPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Hromadný import z TMDb</h1>
      <BulkTmdbImportForm />
    </div>
  );
}
