import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PersonForm from '@/components/PersonForm';

export default async function SuggestPersonPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const isAdmin = (session.user as any).role === 'ADMIN';

  return (
    <div className="pt-8 max-w-xl mx-auto">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Přidat tvůrce</h1>
      {!isAdmin && (
        <p className="text-muted mb-8">
          Tvůj návrh se uloží, ale na webu se ostatním ukáže až poté, co ho schválí administrátor. Do schválení ho uvidíš jen ty.
        </p>
      )}
      <PersonForm redirectTo="/osobnost/pridat/dakujeme" />
    </div>
  );
}
