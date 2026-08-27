import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminTabs from '@/components/AdminTabs';
import TrailerSubtitleAdminList from '@/components/TrailerSubtitleAdminList';
import { youtubeVideoId } from '@/lib/markdown';

export const dynamic = 'force-dynamic';

export default async function AdminTrailersPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login');

  const videos = await prisma.movieVideo.findMany({
    where: { category: 'trailer', episodeId: null, seasonId: null },
    orderBy: { createdAt: 'desc' },
    include: {
      movie: { select: { id: true, title: true, slug: true, poster: true } },
      subtitles: { orderBy: { startTime: 'asc' }, select: { id: true, startTime: true, endTime: true, text: true } }
    }
  });

  const items = videos
    .map((v) => ({ id: v.id, title: v.title, youtubeId: youtubeVideoId(v.url), previewImage: v.previewImage, featuredOnHome: v.featuredOnHome, subtitles: v.subtitles, movie: v.movie }))
    .filter((v) => v.youtubeId) as {
    id: string;
    title: string | null;
    youtubeId: string;
    previewImage: string | null;
    featuredOnHome: boolean;
    subtitles: { id: string; startTime: number; endTime: number; text: string }[];
    movie: { id: string; title: string; slug: string; poster: string | null };
  }[];

  return (
    <div className="pt-8">
      <AdminTabs />
      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Administrácia</div>
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Trailery</h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Video sa pri filme (cez "Upraviť film" → Videá) vždy pridá len na jeho vlastný profil. Sem sa dostanú všetky
        trailery zo všetkých filmov naraz — a odtiaľto vyberáš, ktoré z nich sa <strong className="text-ink">navyše zobrazia
        aj na hlavnej stránke</strong> (tlačidlo "Zobraziť na hlavnej stránke"). Tu vieš k trailerom doplniť aj titulky
        alebo vlastný náhľadový obrázok. Trailer s titulkami má na hlavnej stránke aj na profile filmu prednosť pred
        trailerom bez nich.
      </p>

      <TrailerSubtitleAdminList items={items} />
    </div>
  );
}
