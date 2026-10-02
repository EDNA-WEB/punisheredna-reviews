CREATE TABLE IF NOT EXISTS "FanFavorite" (
  "id" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "sourceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "year" INTEGER,
  "tmdbId" INTEGER,
  "mediaType" TEXT,
  "movieId" TEXT,
  "importError" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FanFavorite_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FanFavorite_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "FanFavorite_sourceId_key" ON "FanFavorite"("sourceId");
CREATE INDEX IF NOT EXISTS "FanFavorite_rank_idx" ON "FanFavorite"("rank");
