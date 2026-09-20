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
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-8">Nová novinka</h1>
      {!isAdmin && isEditor && (
        <p className="text-sm text-muted mb-6 -mt-4">
          Ako redaktor môžeš v administrácii pridávať len novinky — nič iné tu nie je dostupné.
        </p>
      )}
      <NewsForm />
    </div>
  );
}
