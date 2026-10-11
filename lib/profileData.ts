import { prisma } from './prisma';

// Údaje pre nový profil používateľa (app/profile/[id]/page.tsx):
// filmový vkus (priemer, rozloženie hviezd, žánre) a kalendár aktivity.

export type Taste = {
  average: number | null;
  total: number;
  histogram: { stars: number; percent: number }[]; // 5 → 1
  genres: { genre: string; percent: number }[];
};

export async function loadTaste(userId: string): Promise<Taste> {
  const ratings = await prisma.rating.findMany({
    where: { userId, seasonId: null, episodeId: null },
    select: { value: true, movie: { select: { genres: true } } }
  });
  const total = ratings.length;
  if (!total) return { average: null, total: 0, histogram: [], genres: [] };

  const buckets = [0, 0, 0, 0, 0];
  let sum = 0;
  const genreMap = new Map<string, number>();
  for (const r of ratings) {
    sum += r.value;
    const b = Math.min(5, Math.max(1, Math.floor(r.value))); // 4,5 hviezdy patria k „4“
    buckets[b - 1] += 1;
    for (const g of (r.movie.genres || '').split(',').map((x) => x.trim()).filter(Boolean)) {
      genreMap.set(g, (genreMap.get(g) || 0) + 1);
    }
  }
  const genreTotal = Array.from(genreMap.values()).reduce((a, b) => a + b, 0) || 1;
  return {
    average: Math.round((sum / total) * 10) / 10,
    total,
    histogram: [5, 4, 3, 2, 1].map((stars) => ({ stars, percent: Math.round((buckets[stars - 1] / total) * 100) })),
    genres: Array.from(genreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, count]) => ({ genre, percent: Math.round((count / genreTotal) * 100) }))
  };
}

export type Activity = {
  weeks: { date: string; level: number; count: number; future: boolean }[][]; // stĺpce = týždne, riadky = Po–Ne
  ratings: number;
  reviews: number;
  streak: number;
};

const TZ = 'Europe/Prague';
const dayKey = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: TZ }); // RRRR-MM-DD

// Kalendár aktivity za posledných 17 týždňov (hodnotenia + recenzie po dňoch).
export async function loadActivity(userId: string, weeksBack = 17): Promise<Activity> {
  const todayKey = dayKey(new Date());
  // dnešok ako „poludnie UTC“, nech posuny o dni nepreskočia zmenu času
  const today = new Date(`${todayKey}T12:00:00Z`);
  const weekday = (today.getUTCDay() + 6) % 7; // Po = 0
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - weekday - (weeksBack - 1) * 7);
  const since = new Date(start.getTime() - 36 * 60 * 60 * 1000);

  const [ratings, reviews] = await Promise.all([
    prisma.rating.findMany({ where: { userId, seasonId: null, episodeId: null, createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.review.findMany({ where: { authorId: userId, seasonId: null, episodeId: null, createdAt: { gte: since } }, select: { createdAt: true } })
  ]);

  const counts = new Map<string, number>();
  const startKey = dayKey(start);
  let ratingCount = 0;
  let reviewCount = 0;
  for (const r of ratings) {
    const k = dayKey(r.createdAt);
    if (k < startKey) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
    ratingCount++;
  }
  for (const r of reviews) {
    const k = dayKey(r.createdAt);
    if (k < startKey) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
    reviewCount++;
  }

  const level = (n: number) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4);
  const weeks: Activity['weeks'] = [];
  const cursor = new Date(start);
  for (let w = 0; w < weeksBack; w++) {
    const col: Activity['weeks'][number] = [];
    for (let d = 0; d < 7; d++) {
      const k = cursor.toISOString().slice(0, 10);
      const n = counts.get(k) || 0;
      col.push({ date: k, count: n, level: level(n), future: k > todayKey });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(col);
  }

  // Séria: koľko dní po sebe (končiac dnes, prípadne včera) mal aspoň jednu aktivitu.
  let streak = 0;
  const probe = new Date(today);
  if (!counts.get(todayKey)) probe.setUTCDate(probe.getUTCDate() - 1);
  while (counts.get(probe.toISOString().slice(0, 10))) {
    streak++;
    probe.setUTCDate(probe.getUTCDate() - 1);
  }

  return { weeks, ratings: ratingCount, reviews: reviewCount, streak };
}
