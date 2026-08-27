import { prisma } from '@/lib/prisma';
import { getDictionary, getUserLanguage } from '@/lib/i18n';

export default async function TopVideosList() {
  const t = (await getDictionary(await getUserLanguage()));
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const views = await prisma.trailerView.groupBy({
    by: ['movieVideoId'],
    where: { viewedAt: { gte: since }, movieVideoId: { not: null } },
    _count: { movieVideoId: true },
    orderBy: { _count: { movieVideoId: 'desc' } },
    take: 7
  });

  if (views.length === 0) return null;

  const videoIds = views.map((v) => v.movieVideoId).filter((id): id is string => !!id);
  const videos = await prisma.movieVideo.findMany({
    where: { id: { in: videoIds } },
    include: { movie: { select: { title: true, poster: true } } }
  });
  const videoById = new Map(videos.map((v) => [v.id, v]));

  const items = views
    .map((v) => ({ video: v.movieVideoId ? videoById.get(v.movieVideoId) : undefined, count: v._count.movieVideoId }))
    .filter((i) => i.video);

  if (items.length === 0) return null;

  return (
    <div className="border border-line rounded-xl p-4 bg-card">
      <h3 className="font-display font-bold text-sm text-ink mb-3">{t['home.najsledovanejsie_videa'] || 'Najsledovanejšie videá'}</h3>
      <div className="space-y-3">
        {items.map(({ video, count }, i) => (
          <div key={video!.id} className="flex items-center gap-3">
            <span className="w-5 text-center text-xs font-extrabold text-accent flex-none">{i + 1}</span>
            <div
              className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none"
              style={video!.movie.poster ? { backgroundImage: `url('${video!.movie.poster}')` } : undefined}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink truncate">{video!.title || video!.movie.title}</div>
              <div className="text-[11px] text-muted">Trailer · {count} prehratí</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
