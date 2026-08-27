-- CreateTable
CREATE TABLE "CaptchaChallenge" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptchaChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaptchaChallenge_createdAt_idx" ON "CaptchaChallenge"("createdAt");
