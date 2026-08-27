import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { IconUser, IconHeartOutline } from '@/components/Icons';
import CriticBadge from '@/components/CriticBadge';
import StarRating from '@/components/StarRating';
import EmptyState from '@/components/EmptyState';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const viewerId = (session.user as any).id;

  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    include: {
      following: { select: { id: true, name: true, avatar: true, role: true, membershipUntil: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const withActivity = await Promise.all(
    following.map(async (f) => {
      const [ratings, reviews] = await Promise.all([
        prisma.rating.findMany({
          where: { userId: f.following.id, seasonId: null, episodeId: null },
          orderBy: { createdAt: 'desc' },
          take: 4,
          include: { movie: { select: { title: true, slug: true, poster: true } } }
        }),
        prisma.review.findMany({
          where: { authorId: f.following.id, seasonId: null, episodeId: null },
          orderBy: { createdAt: 'desc' },
          take: 4,
          include: { movie: { select: { title: true, slug: true, poster: true } } }
        })
      ]);
      return { user: f.following, ratings, reviews };
    })
  );

  return (
    <div className="pt-8">
      <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Obľúbení používatelia</h1>
      <p className="text-muted mb-8">Čo hodnotili a k čomu napísali recenziu ľudia, ktorých sleduješ.</p>

      {withActivity.length === 0 ? (
        <EmptyState
          icon={<IconHeartOutline className="w-5 h-5" />}
          title="Zatiaľ nikoho nemáš v obľúbených"
          description="Pridaj si niekoho cez tlačidlo na jeho profile."
          actionLabel="Prezrieť používateľov"
          actionHref="/pouzivatelia"
        />
      ) : (
        <div className="space-y-8">
          {withActivity.map(({ user, ratings, reviews }) => (
            <div key={user.id} className="border border-line rounded-xl p-5 bg-card">
              <Link href={`/profile/${user.id}`} className="flex items-center gap-3 mb-4 hover:text-accent w-fit">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-surface flex items-center justify-center">
                    <IconUser className="w-5 h-5 text-muted" />
                  </div>
                )}
                <span className="font-display font-bold text-ink flex items-center gap-1.5">
                  {user.name}
                  {user.role === 'ADMIN' && <CriticBadge size="w-4 h-4" label={false} />}
                  
                </span>
              </Link>

              {ratings.length === 0 && reviews.length === 0 ? (
                <p className="text-sm text-muted">Zatiaľ žiadna aktivita.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2.5">Ohodnotil</div>
                    {ratings.length === 0 ? (
                      <p className="text-sm text-muted">Zatiaľ nič.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {ratings.map((r) => (
                          <Link key={r.id} href={`/movie/${r.movie.slug}`} className="flex items-center gap-2.5 hover:text-accent">
                            <div className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none" style={r.movie.poster ? { backgroundImage: `url('${r.movie.poster}')` } : undefined} />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-ink truncate">{r.movie.title}</div>
                              <StarRating rating={r.value} size="w-3 h-3" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2.5">Napísal recenziu</div>
                    {reviews.length === 0 ? (
                      <p className="text-sm text-muted">Zatiaľ žiadna.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {reviews.map((r) => (
                          <Link key={r.id} href={`/movie/${r.movie.slug}`} className="flex items-center gap-2.5 hover:text-accent">
                            <div className="w-8 h-11 rounded bg-surface bg-cover bg-center flex-none" style={r.movie.poster ? { backgroundImage: `url('${r.movie.poster}')` } : undefined} />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-ink truncate">{r.movie.title}</div>
                              <div className="text-[11px] text-muted">{new Date(r.createdAt).toLocaleDateString('sk-SK')}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
