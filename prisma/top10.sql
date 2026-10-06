CREATE TABLE IF NOT EXISTS "Top10Entry" (
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
  CONSTRAINT "Top10Entry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Top10Entry_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Top10Entry_sourceId_key" ON "Top10Entry"("sourceId");
CREATE INDEX IF NOT EXISTS "Top10Entry_rank_idx" ON "Top10Entry"("rank");

CREATE TABLE IF NOT EXISTS "SeenMovie" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "movieId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeenMovie_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SeenMovie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SeenMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "SeenMovie_userId_movieId_key" ON "SeenMovie"("userId", "movieId");
CREATE INDEX IF NOT EXISTS "SeenMovie_movieId_idx" ON "SeenMovie"("movieId");
