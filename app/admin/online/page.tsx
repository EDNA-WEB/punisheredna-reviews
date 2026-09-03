import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import OnlineAdminList from '@/components/OnlineAdminList';

export const dynamic = 'force-dynamic';

export default async function AdminOnlinePage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const movies = await prisma.movie.findMany({
    where: { approved: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      poster: true,
      watchUrl: true,
      onlineImage: true,
      contentType: true,
      tmdbId: true,
      seasons: {
        orderBy: { number: 'asc' },
        select: {
          id: true,
          number: true,
          episodes: {
            orderBy: { number: 'asc' },
            select: { id: true, number: true, title: true, onlineImage: true, onlineUrl: true }
          }
        }
      }
    }
  });

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Online</h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Nastav odkaz, kam sa diváci presmerujú, keď kliknú na náhľad v záložke "Online", a náhľadový obrázok, ktorý sa
        im pri tom zobrazí. Pri seriáloch vieš rozkliknúť aj jednotlivé epizódy a nastaviť to isté pre každú zvlášť.
      </p>

      <OnlineAdminList movies={movies} />
    </div>
  );
}
