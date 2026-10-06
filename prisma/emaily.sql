ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustVerifyEmail" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationSentAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetSentAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNews" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailOnline" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailMessages" BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS "User_passwordResetHash_key" ON "User"("passwordResetHash");

ALTER TABLE "Movie" ADD COLUMN IF NOT EXISTS "onlineNotifiedAt" TIMESTAMP(3);
ALTER TABLE "NewsPost" ADD COLUMN IF NOT EXISTS "emailedAt" TIMESTAMP(3);
ALTER TABLE "NewsPost" ADD COLUMN IF NOT EXISTS "emailedCount" INTEGER;

CREATE TABLE IF NOT EXISTS "EmailThrottle" (
  "key" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailThrottle_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "EmailThrottle_sentAt_idx" ON "EmailThrottle"("sentAt");

-- Filmy, ktoré už online SÚ, sa označia ako oznámené — nech po zapnutí
-- nepríde nikomu hromada e-mailov naraz. Upozorní sa len na nové odkazy.
UPDATE "Movie" m SET "onlineNotifiedAt" = now()
WHERE m."onlineNotifiedAt" IS NULL
  AND (m."watchUrl" IS NOT NULL OR EXISTS (
    SELECT 1 FROM "Episode" e JOIN "Season" s ON s.id = e."seasonId" WHERE s."movieId" = m.id AND e."onlineUrl" IS NOT NULL));
