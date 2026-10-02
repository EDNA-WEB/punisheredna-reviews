import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import LocalizationAdminList from '@/components/LocalizationAdminList';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminLocalizationPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const movies = await prisma.movie.findMany({
    where: { approved: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, poster: true, year: true, contentType: true, hasSubtitles: true, hasDubbing: true, createdAt: true }
  });

  // Filmy bez dabingu aj titulkov idú navrch (od najnovšie pridaných), nech sa
  // nestratia v abecednom zozname. Vyplnené nasledujú za nimi, tiež od najnovších.
  const sortedMovies = [...movies].sort((a, b) => {
    const aFilled = a.hasSubtitles || a.hasDubbing;
    const bFilled = b.hasSubtitles || b.hasDubbing;
    if (aFilled !== bFilled) return aFilled ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Dabing a titulky</>} description={<>Rychlé hromadné nastavení, které filmy a seriály mají dabing, titulky, nebo ani jedno — bez nutnosti otevírat každý film zvlášť přes "Upravit film".</>} />

      <LocalizationAdminList movies={sortedMovies} />
    </div>
  );
}
