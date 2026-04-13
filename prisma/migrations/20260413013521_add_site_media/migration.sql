/*
  Warnings:

  - You are about to drop the `tienda_fotos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "tienda_fotos";

-- CreateTable
CREATE TABLE "site_media" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "key" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_media_pkey" PRIMARY KEY ("id")
);
