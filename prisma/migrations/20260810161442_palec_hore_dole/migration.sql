/*
  Warnings:

  - A unique constraint covering the columns `[userId,newsId]` on the table `Like` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Like" ADD COLUMN     "newsId" TEXT,
ADD COLUMN     "value" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_newsId_key" ON "Like"("userId", "newsId");

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "NewsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
