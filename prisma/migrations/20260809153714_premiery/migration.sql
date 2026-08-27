-- CreateTable
CREATE TABLE "Premiere" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "year" TEXT,
    "country" TEXT,
    "genres" TEXT,
    "director" TEXT,
    "poster" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Premiere_pkey" PRIMARY KEY ("id")
);
