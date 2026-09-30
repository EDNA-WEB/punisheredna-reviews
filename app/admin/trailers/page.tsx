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
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Trailery</h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Video se u filmu (přes "Upravit film" → Videa) vždy přidá jen na jeho vlastní profil. Sem se dostanou všechny trailery ze všech filmů najednou — a odsud vybíráš, které z nich se <strong className="text-ink">navyše zobrazia
        aj na hlavnej stránke</strong> (tlačítko "Zobrazit na hlavní stránce"). Tady můžeš k trailerům doplnit i titulky nebo vlastní náhledový obrázek. Trailer s titulky má na hlavní stránce i na profilu filmu přednost před trailerem bez nich.
      </p>

      <TrailerSubtitleAdminList items={items} />
    </div>
  );
}
