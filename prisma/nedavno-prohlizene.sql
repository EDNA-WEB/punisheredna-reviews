-- Nedávno prohlížené (spoločné pre web aj appku)
-- Neon → SQL Editor → vložiť celé → Run (nie Explain).
CREATE TABLE IF NOT EXISTS "RecentlyViewed" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "movieId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecentlyViewed_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecentlyViewed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecentlyViewed_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "RecentlyViewed_userId_movieId_key" ON "RecentlyViewed"("userId", "movieId");
CREATE INDEX IF NOT EXISTS "RecentlyViewed_userId_viewedAt_idx" ON "RecentlyViewed"("userId", "viewedAt");
