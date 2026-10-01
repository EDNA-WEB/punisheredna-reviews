-- Hlasovky: nové stĺpce v tabuľke "Message" (len pridáva, nič nemaže).
-- Spusti v Neon → SQL Editor PRED nasadením nového kódu.
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "voice" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "audioPublicId" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "audioFormat" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "audioDuration" INTEGER;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "audioWaveform" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "audioListenedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "audioExpiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Message_audioExpiresAt_idx" ON "Message"("audioExpiresAt");
