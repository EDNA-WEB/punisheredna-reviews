-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "wallpaper" TEXT,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
