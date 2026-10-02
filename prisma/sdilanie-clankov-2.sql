-- Zdieľanie článkov: tajné kľúče v odkazoch + štatistika kliknutí (len pridáva).
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "articleShareEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "articleShareSalt" TEXT;
CREATE TABLE IF NOT EXISTS "ArticleShareView" (
  "id" TEXT NOT NULL,
  "articleType" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "visitorHash" TEXT NOT NULL,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleShareView_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ArticleShareView_articleType_articleId_idx" ON "ArticleShareView"("articleType", "articleId");
CREATE INDEX IF NOT EXISTS "ArticleShareView_createdAt_idx" ON "ArticleShareView"("createdAt");
