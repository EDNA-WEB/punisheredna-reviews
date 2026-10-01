-- Akcie so správami (reakcie, úprava, odpoveď, preposlanie, pripnutie).
-- Len pridáva, nič nemaže. Spusti v Neon → SQL Editor PRED nasadením.
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "replyToId" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "forwarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "pinnedById" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "activityAt" TIMESTAMP(3);
CREATE TABLE IF NOT EXISTS "MessageReaction" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");
CREATE INDEX IF NOT EXISTS "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");
DO $$ BEGIN
  ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
