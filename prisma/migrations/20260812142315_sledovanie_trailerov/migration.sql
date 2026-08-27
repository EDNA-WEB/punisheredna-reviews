-- CreateTable
CREATE TABLE "TrailerView" (
    "id" TEXT NOT NULL,
    "trailerId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailerView_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TrailerView" ADD CONSTRAINT "TrailerView_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "Trailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
