-- Dvojfázové overenie (lib/twoFactor.ts). Spustiť raz v Neon SQL Editore.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorPendingSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorBackupCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorLastStep" INTEGER;

-- NÚDZA (len ak niekto stratí telefón aj záložné kódy): vypne overenie jednému
-- účtu. Odkomentuj, doplň prezývku a spusti samostatne.
-- UPDATE "User" SET "twoFactorSecret" = NULL, "twoFactorPendingSecret" = NULL, "twoFactorEnabledAt" = NULL,
--   "twoFactorBackupCodes" = ARRAY[]::TEXT[], "twoFactorLastStep" = NULL WHERE "name" = 'PREZYVKA';
