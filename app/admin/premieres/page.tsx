import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import PremiereAdminForm from '@/components/PremiereAdminForm';
import AdminPremiereActions from '@/components/AdminPremiereActions';

export const dynamic = 'force-dynamic';

export default async function AdminPremieresPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const premieres = await prisma.premiere.findMany({ orderBy: { releaseDate: 'asc' } });

  return (
    <div className="pt-8">
      <AdminTabs />
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Filmové premiéry</h1>
      <p className="text-sm text-muted mb-6">Zobrazujú sa v postrannom paneli na hlavnej stránke, zoradené podľa dátumu.</p>

      <div className="mb-8">
        <PremiereAdminForm />
      </div>

      {premieres.length === 0 ? (
        <div className="border border-line rounded-xl p-10 text-center text-muted bg-surface">Zatiaľ žiadne premiéry.</div>
      ) : (
        <div className="border border-line rounded-xl divide-y divide-line overflow-hidden max-w-lg">
          {premieres.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3.5 bg-card">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink truncate">{p.title}</div>
                <div className="text-xs text-muted">{new Date(p.releaseDate).toLocaleDateString('sk-SK')} · {p.country} {p.genres ? `· ${p.genres}` : ''}</div>
              </div>
              <AdminPremiereActions id={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
