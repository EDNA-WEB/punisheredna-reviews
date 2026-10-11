-- Balík A: údaje prevádzkovateľa a súhlas s pravidlami pri registrácii.
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "operatorName" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "operatorCompanyId" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "operatorAddress" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "operatorEmail" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;
