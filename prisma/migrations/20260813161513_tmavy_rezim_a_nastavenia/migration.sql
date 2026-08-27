-- AlterTable
ALTER TABLE "User" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'sk',
ADD COLUMN     "timezone" TEXT;
