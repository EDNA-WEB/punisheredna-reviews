-- CreateTable
CREATE TABLE "TranslationString" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "sk" TEXT NOT NULL,
    "en" TEXT,
    "cs" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationString_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TranslationString_key_key" ON "TranslationString"("key");
