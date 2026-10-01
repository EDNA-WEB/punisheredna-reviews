-- Fotky v chate (24 h): nové stĺpce v tabuľke "Message" (len pridáva, nič nemaže).
-- Spusti v Neon → SQL Editor PRED nasadením nového kódu.
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "photo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "imagePublicId" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "imageExpiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Message_imageExpiresAt_idx" ON "Message"("imageExpiresAt");
CREATE INDEX IF NOT EXISTS "Message_senderId_photo_createdAt_idx" ON "Message"("senderId", "photo", "createdAt");
-- Staré fotky (pred touto zmenou) dostanú 24 h od svojho odoslania.
UPDATE "Message" SET "photo" = true, "imageExpiresAt" = "createdAt" + INTERVAL '24 hours'
WHERE "image" IS NOT NULL AND "imageExpiresAt" IS NULL;
