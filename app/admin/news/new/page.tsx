import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import NewsForm from '@/components/NewsForm';

export default async function NewNewsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const isEditor = (session?.user as any)?.isEditor;
  if (!session || (!isAdmin && !isEditor)) redirect('/login');

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Nová novinka</h1>
      {!isAdmin && isEditor && (
        <p className="text-sm text-muted mb-6 -mt-4">
          Jako redaktor můžeš v administraci přidávat jen novinky — nic jiného tu není dostupné.
        </p>
      )}
      <NewsForm />
    </div>
  );
}
