import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import StreamingServicesAdmin from '@/components/StreamingServicesAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminKdeSledovatPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const [services, movies] = await Promise.all([
    prisma.streamingService.findMany({ orderBy: { order: 'asc' } }),
    prisma.movie.findMany({
      where: { approved: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        poster: true,
        year: true,
        streamingServices: {
          select: { streamingServiceId: true, url: true }
        }
      }
    })
  ]);

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-6">Kde sledovať</h1>
      <StreamingServicesAdmin initialServices={services} initialMovies={movies} />
    </div>
  );
}
