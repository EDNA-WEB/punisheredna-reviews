-- Analytika zdieľaných článkov (len pridáva, nič nemaže).
CREATE TABLE IF NOT EXISTS "AnalyticsSalt" (
  "day" TEXT NOT NULL,
  "salt" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsSalt_pkey" PRIMARY KEY ("day")
);
CREATE TABLE IF NOT EXISTS "VisitorSession" (
  "id" TEXT NOT NULL,
  "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceTag" TEXT,
  "referrerHost" TEXT,
  "deviceType" TEXT,
  "os" TEXT,
  "browser" TEXT,
  "country" TEXT,
  "region" TEXT,
  "city" TEXT,
  "asn" INTEGER,
  "asnOrg" TEXT,
  "pages" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "VisitorSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VisitorSession_firstSeen_idx" ON "VisitorSession"("firstSeen");
CREATE INDEX IF NOT EXISTS "VisitorSession_sourceTag_idx" ON "VisitorSession"("sourceTag");
CREATE TABLE IF NOT EXISTS "ShareVisit" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "articleType" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShareVisit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ShareVisit_articleType_articleId_visitedAt_idx" ON "ShareVisit"("articleType", "articleId", "visitedAt");
CREATE INDEX IF NOT EXISTS "ShareVisit_visitedAt_idx" ON "ShareVisit"("visitedAt");
DO $$ BEGIN
  ALTER TABLE "ShareVisit" ADD CONSTRAINT "ShareVisit_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "ShareDailyStat" (
  "day" TEXT NOT NULL,
  "articleType" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "sourceTag" TEXT NOT NULL DEFAULT '',
  "referrerHost" TEXT NOT NULL DEFAULT '',
  "country" TEXT NOT NULL DEFAULT '',
  "deviceType" TEXT NOT NULL DEFAULT '',
  "visits" INTEGER NOT NULL,
  "sessions" INTEGER NOT NULL,
  CONSTRAINT "ShareDailyStat_pkey" PRIMARY KEY ("day", "articleType", "articleId", "sourceTag", "referrerHost", "country", "deviceType")
);
CREATE INDEX IF NOT EXISTS "ShareDailyStat_articleType_articleId_idx" ON "ShareDailyStat"("articleType", "articleId");
CREATE TABLE IF NOT EXISTS "LegalRequest" (
  "id" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authority" TEXT NOT NULL,
  "referenceNo" TEXT NOT NULL,
  "legalBasis" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "provided" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "handledBy" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LegalRequest_receivedAt_idx" ON "LegalRequest"("receivedAt");

-- Prenesenie doterajšej štatistiky (ArticleShareView) do nových súhrnov
INSERT INTO "ShareDailyStat" ("day", "articleType", "articleId", "sourceTag", "referrerHost", "country", "deviceType", "visits", "sessions")
SELECT to_char("createdAt", 'YYYY-MM-DD'), "articleType", "articleId", '', COALESCE("source", ''), '', '',
       COUNT(*), COUNT(DISTINCT "visitorHash")
FROM "ArticleShareView"
GROUP BY 1, 2, 3, 5
ON CONFLICT DO NOTHING;
