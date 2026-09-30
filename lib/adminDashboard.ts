import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

// Dáta pre dashboard administrácie. Cache 2 minúty — dashboard sa otvára často,
// no čísla sa menia pomaly; databáza sa tak kvôli nemu nebudí pri každom kliknutí.
export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;

const DAY = 24 * 60 * 60 * 1000;

async function loadDashboard() {
  const now = Date.now();
  const d7 = new Date(now - 7 * DAY);
  const d14 = new Date(now - 14 * DAY);
  const d1 = new Date(now - DAY);

  const [
    users, usersNew, usersPrev, activeToday, members,
    movies, moviesNew, moviesPrev,
    reviews, reviewsNew, reviewsPrev,
    ratings, ratingsNew, ratingsPrev,
    pendingMovies, pendingPeople, pendingSubmissions, onlineReports, chatReports, publishRequests,
    recentReviews, recentUsers
  ] = await Promise.all([
    prisma.user.count({ where: { deleted: false } }),
    prisma.user.count({ where: { deleted: false, createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { deleted: false, createdAt: { gte: d14, lt: d7 } } }),
    prisma.user.count({ where: { deleted: false, lastActiveAt: { gte: d1 } } }),
    prisma.user.count({ where: { membershipUntil: { gt: new Date(now) } } }),
    prisma.movie.count({ where: { approved: true } }),
    prisma.movie.count({ where: { approved: true, createdAt: { gte: d7 } } }),
    prisma.movie.count({ where: { approved: true, createdAt: { gte: d14, lt: d7 } } }),
    prisma.review.count(),
    prisma.review.count({ where: { createdAt: { gte: d7 } } }),
    prisma.review.count({ where: { createdAt: { gte: d14, lt: d7 } } }),
    prisma.rating.count(),
    prisma.rating.count({ where: { createdAt: { gte: d7 } } }),
    prisma.rating.count({ where: { createdAt: { gte: d14, lt: d7 } } }),
    prisma.movie.count({ where: { approved: false } }),
    prisma.person.count({ where: { approved: false } }),
    prisma.contentSubmission.count({ where: { status: 'PENDING' } }),
    prisma.onlineReport.count({ where: { resolved: false } }),
    prisma.messageReport.count({ where: { createdAt: { gte: d7 } } }),
    prisma.blogPost.count({ where: { publicationRequested: true, published: false } }),
    prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        createdAt: true,
        author: { select: { id: true, name: true, avatar: true } },
        movie: { select: { title: true, slug: true, poster: true } }
      }
    }),
    prisma.user.findMany({
      where: { deleted: false },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, name: true, avatar: true, createdAt: true }
    })
  ]);

  // Denné počty za posledných 14 dní (registrácie, recenzie, hodnotenia) — jeden dopyt.
  const series = await prisma.$queryRaw<{ day: Date; users: bigint; reviews: bigint; ratings: bigint }[]>`
    SELECT d::date AS day,
      (SELECT COUNT(*) FROM "User" u WHERE u."createdAt" >= d AND u."createdAt" < d + interval '1 day') AS users,
      (SELECT COUNT(*) FROM "Review" r WHERE r."createdAt" >= d AND r."createdAt" < d + interval '1 day') AS reviews,
      (SELECT COUNT(*) FROM "Rating" g WHERE g."createdAt" >= d AND g."createdAt" < d + interval '1 day') AS ratings
    FROM generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') AS d
    ORDER BY d
  `;

  return {
    generatedAt: new Date(now).toISOString(),
    kpi: {
      users: { total: users, new7: usersNew, prev7: usersPrev },
      movies: { total: movies, new7: moviesNew, prev7: moviesPrev },
      reviews: { total: reviews, new7: reviewsNew, prev7: reviewsPrev },
      ratings: { total: ratings, new7: ratingsNew, prev7: ratingsPrev },
      activeToday,
      members
    },
    queue: { pendingMovies, pendingPeople, pendingSubmissions, onlineReports, chatReports, publishRequests },
    series: series.map((s) => ({
      day: new Date(s.day).toISOString().slice(0, 10),
      users: Number(s.users),
      reviews: Number(s.reviews),
      ratings: Number(s.ratings)
    })),
    recentReviews: recentReviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    recentUsers: recentUsers.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))
  };
}

export const getDashboardData = unstable_cache(loadDashboard, ['admin-dashboard-v1'], { revalidate: 120, tags: ['admin-dashboard'] });

// Počty čakajúcich položiek pre odznaky v bočnom paneli (cache 2 min).
export const getAdminBadges = unstable_cache(
  async () => {
    const [submissions, onlineReports, chatReports, pendingMovies, pendingPeople] = await Promise.all([
      prisma.contentSubmission.count({ where: { status: 'PENDING' } }),
      prisma.onlineReport.count({ where: { resolved: false } }),
      prisma.messageReport.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * DAY) } } }),
      prisma.movie.count({ where: { approved: false } }),
      prisma.person.count({ where: { approved: false } })
    ]);
    return {
      '/admin/navrhy-obsahu': submissions,
      '/admin/online': onlineReports,
      '/admin/nahlasenia': chatReports,
      '/admin/movies': pendingMovies,
      '/admin/people': pendingPeople
    } as Record<string, number>;
  },
  ['admin-badges-v1'],
  { revalidate: 120, tags: ['admin-dashboard'] }
);
