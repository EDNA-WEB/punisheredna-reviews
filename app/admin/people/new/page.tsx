import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import PersonFormWithTmdbImport from '@/components/PersonFormWithTmdbImport';

export default async function NewPersonPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  return (
    <div className="pt-8">
      <AdminTabs />
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Pridať osobu</h1>
      <PersonFormWithTmdbImport />
    </div>
  );
}
