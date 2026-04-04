/*
  Warnings:

  - You are about to drop the column `peso` on the `productos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "productos" DROP COLUMN "peso";

-- CreateTable
CREATE TABLE "producto_imagenes" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productoId" INTEGER NOT NULL,

    CONSTRAINT "producto_imagenes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "producto_imagenes" ADD CONSTRAINT "producto_imagenes_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
