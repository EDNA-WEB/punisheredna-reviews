import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MovieForm from '@/components/MovieForm';

export default async function SuggestMoviePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const isAdmin = (session.user as any).role === 'ADMIN';

  return (
    <div className="pt-8 max-w-xl mx-auto">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Pridať film</h1>
      {!isAdmin && (
        <p className="text-muted mb-8">
          Tvoj návrh sa uloží, no na webe sa ukáže ostatným až po tom, čo ho schváli administrátor. Do schválenia ho uvidíš len ty.
        </p>
      )}
      <MovieForm redirectTo="/movie/pridat/dakujeme" />
    </div>
  );
}
