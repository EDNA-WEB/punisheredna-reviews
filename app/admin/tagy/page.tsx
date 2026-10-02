import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import TagsAdminList from '@/components/TagsAdminList';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminTagsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const movies = await prisma.movie.findMany({
    where: { approved: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, poster: true, year: true, tags: true, tmdbId: true, createdAt: true }
  });

  // Filmy bez tagov idú navrch (od najnovšie pridaných), nech sa nestratia
  // v abecednom zozname. Vyplnené filmy nasledujú za nimi, tiež od najnovších.
  const sortedMovies = [...movies].sort((a, b) => {
    const aFilled = !!a.tags;
    const bFilled = !!b.tags;
    if (aFilled !== bFilled) return aFilled ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="admin-page">
      <AdminPageHeader title={<>Tagy</>} description={<>Jediné místo pro správu tagů — přidávání, mazání i úpravy. Nastavování tagů nikde jinde na webu není možné.</>} />
      <TagsAdminList initialMovies={sortedMovies} />
    </div>
  );
}
