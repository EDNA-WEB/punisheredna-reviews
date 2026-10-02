-- Indexy pre rýchlejšiu administráciu a import obsadenia (len pridáva, nič nemaže).
CREATE INDEX IF NOT EXISTS "Person_tmdbId_idx" ON "Person"("tmdbId");
CREATE INDEX IF NOT EXISTS "Movie_approved_createdAt_idx" ON "Movie"("approved", "createdAt");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "Review_createdAt_idx" ON "Review"("createdAt");
CREATE INDEX IF NOT EXISTS "Rating_createdAt_idx" ON "Rating"("createdAt");
