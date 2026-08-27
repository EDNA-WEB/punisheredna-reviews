import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import LocalizationAdminList from '@/components/LocalizationAdminList';

export const dynamic = 'force-dynamic';

export default async function AdminLocalizationPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const movies = await prisma.movie.findMany({
    where: { approved: true },
    orderBy: { title: 'asc' },
    select: { id: true, title: true, slug: true, poster: true, year: true, contentType: true, hasSubtitles: true, hasDubbing: true }
  });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Lokalizácia</h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Rýchle hromadné nastavenie, ktoré filmy a seriály majú dabing, titulky, alebo ani jedno — bez potreby otvárať
        každý film zvlášť cez "Upraviť film".
      </p>

      <LocalizationAdminList movies={movies} />
    </div>
  );
}
