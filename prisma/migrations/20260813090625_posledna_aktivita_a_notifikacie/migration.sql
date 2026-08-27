/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `UserActivity` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserActivity_userId_key" ON "UserActivity"("userId");
