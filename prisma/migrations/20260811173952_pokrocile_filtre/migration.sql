-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "contentType" TEXT NOT NULL DEFAULT 'Film';

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "subRole" TEXT;
