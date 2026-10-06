CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetId" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_createdAt_idx" ON "ActivityLog" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog" ("createdAt");

CREATE TABLE IF NOT EXISTS "RegistrationAttempt" (
  "id" TEXT PRIMARY KEY,
  "source" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "emailMasked" TEXT,
  "emailDomain" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "RegistrationAttempt_createdAt_idx" ON "RegistrationAttempt" ("createdAt");
CREATE INDEX IF NOT EXISTS "RegistrationAttempt_result_createdAt_idx" ON "RegistrationAttempt" ("result", "createdAt");

CREATE TABLE IF NOT EXISTS "IpLogHold" (
  "userId" TEXT PRIMARY KEY,
  "note" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
