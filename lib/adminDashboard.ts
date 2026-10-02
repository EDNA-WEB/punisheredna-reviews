import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

// Dáta pre dashboard administrácie.
// Predtým: 23 samostatných dopytov + graf so 42 vnorenými dopytmi, ktoré
// zakaždým prechádzali celé tabuľky (≈ 5,5 s). Teraz: JEDEN dopyt na všetky
// čísla (každá tabuľka sa prejde iba raz) + JEDEN dopyt na graf + 2 krátke
// zoznamy. Cache 3 minúty, zdieľaná všetkými inštanciami servera.
export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;

const DAY = 24 * 60 * 60 * 1000;

type KpiRow = {
  users: bigint; users_new: bigint; users_prev: bigint; active_today: bigint; members: bigint;
  movies: bigint; movies_new: bigint; movies_prev: bigint; pending_movies: bigint;
  reviews: bigint; reviews_new: bigint; reviews_prev: bigint;
  ratings: bigint; ratings_new: bigint; ratings_prev: bigint;
  pending_people: bigint; pending_submissions: bigint; online_reports: bigint; chat_reports: bigint; publish_requests: bigint;
};

async function loadDashboard() {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * DAY);
  const d14 = new Date(now.getTime() - 14 * DAY);
  const d1 = new Date(now.getTime() - DAY);

  const [kpiRows, seriesRows, recentReviews, recentUsers] = await Promise.all([
    prisma.$queryRaw<KpiRow[]>`
      SELECT u.*, m.*, r.*, g.*,
        (SELECT COUNT(*) FROM "Person" WHERE "approved" = false) AS pending_people,
        (SELECT COUNT(*) FROM "ContentSubmission" WHERE "status" = 'PENDING') AS pending_submissions,
        (SELECT COUNT(*) FROM "OnlineReport" WHERE "resolved" = false) AS online_reports,
        (SELECT COUNT(*) FROM "MessageReport" WHERE "reviewed" = false) AS chat_reports,
        (SELECT COUNT(*) FROM "BlogPost" WHERE "publicationRequested" = true AND "published" = false) AS publish_requests
      FROM
        (SELECT COUNT(*) FILTER (WHERE NOT "deleted") AS users,
                COUNT(*) FILTER (WHERE NOT "deleted" AND "createdAt" >= ${d7}) AS users_new,
                COUNT(*) FILTER (WHERE NOT "deleted" AND "createdAt" >= ${d14} AND "createdAt" < ${d7}) AS users_prev,
                COUNT(*) FILTER (WHERE NOT "deleted" AND "lastActiveAt" >= ${d1}) AS active_today,
                COUNT(*) FILTER (WHERE "membershipUntil" > ${now}) AS members
         FROM "User") u,
        (SELECT COUNT(*) FILTER (WHERE "approved") AS movies,
                COUNT(*) FILTER (WHERE "approved" AND "createdAt" >= ${d7}) AS movies_new,
                COUNT(*) FILTER (WHERE "approved" AND "createdAt" >= ${d14} AND "createdAt" < ${d7}) AS movies_prev,
                COUNT(*) FILTER (WHERE NOT "approved") AS pending_movies
         FROM "Movie") m,
        (SELECT COUNT(*) AS reviews,
                COUNT(*) FILTER (WHERE "createdAt" >= ${d7}) AS reviews_new,
                COUNT(*) FILTER (WHERE "createdAt" >= ${d14} AND "createdAt" < ${d7}) AS reviews_prev
         FROM "Review") r,
        (SELECT COUNT(*) AS ratings,
                COUNT(*) FILTER (WHERE "createdAt" >= ${d7}) AS ratings_new,
                COUNT(*) FILTER (WHERE "createdAt" >= ${d14} AND "createdAt" < ${d7}) AS ratings_prev
         FROM "Rating") g
    `,
    // Denné počty za 14 dní — každá tabuľka iba raz (pomocou indexu na createdAt)
    prisma.$queryRaw<{ day: Date; kind: string; n: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, 'users' AS kind, COUNT(*) AS n FROM "User" WHERE "createdAt" >= date_trunc('day', now()) - interval '13 days' GROUP BY 1
      UNION ALL
      SELECT date_trunc('day', "createdAt"), 'reviews', COUNT(*) FROM "Review" WHERE "createdAt" >= date_trunc('day', now()) - interval '13 days' GROUP BY 1
      UNION ALL
      SELECT date_trunc('day', "createdAt"), 'ratings', COUNT(*) FROM "Rating" WHERE "createdAt" >= date_trunc('day', now()) - interval '13 days' GROUP BY 1
    `,
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

  const k = kpiRows[0];
  const n = (v: bigint | number | null | undefined) => Number(v || 0);

  // 14 dní (aj dni bez aktivity)
  const days: Array<{ day: string; users: number; reviews: number; ratings: number }> = [];
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 13 * DAY);
  for (let i = 0; i < 14; i++) days.push({ day: new Date(start.getTime() + i * DAY).toISOString().slice(0, 10), users: 0, reviews: 0, ratings: 0 });
  for (const r of seriesRows) {
    const key = new Date(r.day).toISOString().slice(0, 10);
    const d = days.find((x) => x.day === key);
    if (d && (r.kind === 'users' || r.kind === 'reviews' || r.kind === 'ratings')) d[r.kind] = n(r.n);
  }

  return {
    generatedAt: now.toISOString(),
    kpi: {
      users: { total: n(k.users), new7: n(k.users_new), prev7: n(k.users_prev) },
      movies: { total: n(k.movies), new7: n(k.movies_new), prev7: n(k.movies_prev) },
      reviews: { total: n(k.reviews), new7: n(k.reviews_new), prev7: n(k.reviews_prev) },
      ratings: { total: n(k.ratings), new7: n(k.ratings_new), prev7: n(k.ratings_prev) },
      activeToday: n(k.active_today),
      members: n(k.members)
    },
    queue: {
      pendingMovies: n(k.pending_movies),
      pendingPeople: n(k.pending_people),
      pendingSubmissions: n(k.pending_submissions),
      onlineReports: n(k.online_reports),
      chatReports: n(k.chat_reports),
      publishRequests: n(k.publish_requests)
    },
    series: days,
    recentReviews: recentReviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    recentUsers: recentUsers.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))
  };
}

export const getDashboardData = unstable_cache(loadDashboard, ['admin-dashboard-v2'], { revalidate: 180, tags: ['admin-dashboard'] });

// Počty čakajúcich položiek pre odznaky v bočnom paneli — jeden dopyt (cache 2 min).
export const getAdminBadges = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<Array<{ s: bigint; o: bigint; c: bigint; m: bigint; p: bigint }>>`
      SELECT
        (SELECT COUNT(*) FROM "ContentSubmission" WHERE "status" = 'PENDING') AS s,
        (SELECT COUNT(*) FROM "OnlineReport" WHERE "resolved" = false) AS o,
        (SELECT COUNT(*) FROM "MessageReport" WHERE "reviewed" = false) AS c,
        (SELECT COUNT(*) FROM "Movie" WHERE "approved" = false) AS m,
        (SELECT COUNT(*) FROM "Person" WHERE "approved" = false) AS p
    `;
    const r = rows[0];
    return {
      '/admin/navrhy-obsahu': Number(r.s),
      '/admin/online': Number(r.o),
      '/admin/nahlasenia': Number(r.c),
      '/admin/movies': Number(r.m),
      '/admin/people': Number(r.p)
    } as Record<string, number>;
  },
  ['admin-badges-v2'],
  { revalidate: 120, tags: ['admin-dashboard'] }
);
