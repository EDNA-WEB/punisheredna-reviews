/*
  Warnings:

  - A unique constraint covering the columns `[movieId,authorId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Review_movieId_authorId_key" ON "Review"("movieId", "authorId");
