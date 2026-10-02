-- Dočasné verejné zdieľanie článkov (len pridáva stĺpec, nič nemaže).
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "articleShareEnabled" BOOLEAN NOT NULL DEFAULT false;
