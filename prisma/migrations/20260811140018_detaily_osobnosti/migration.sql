-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "movieId" TEXT;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "birthPlace" TEXT,
ADD COLUMN     "deathDate" TIMESTAMP(3),
ADD COLUMN     "deathPlace" TEXT;

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;
