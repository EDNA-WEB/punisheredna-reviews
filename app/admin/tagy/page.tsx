import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import TagsAdminList from '@/components/TagsAdminList';

export const dynamic = 'force-dynamic';

export default async function AdminTagsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const movies = await prisma.movie.findMany({
    where: { approved: true },
    orderBy: { title: 'asc' },
    select: { id: true, title: true, slug: true, poster: true, year: true, tags: true, tmdbId: true }
  });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Tagy</h1>
      <p className="text-sm text-muted mb-6">
        Jediné miesto na správu tagov — pridávanie, mazanie aj úpravu. Nastavovanie tagov nikde inde na webe nie je možné.
      </p>
      <TagsAdminList initialMovies={movies} />
    </div>
  );
}
