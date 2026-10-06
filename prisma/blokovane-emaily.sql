CREATE TABLE IF NOT EXISTS "EmailDomainRule" (
  "domain" TEXT NOT NULL,
  "allow" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailDomainRule_pkey" PRIMARY KEY ("domain")
);
