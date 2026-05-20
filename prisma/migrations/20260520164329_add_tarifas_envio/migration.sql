-- CreateTable
CREATE TABLE "tarifas_envio" (
    "id" SERIAL NOT NULL,
    "destino" TEXT NOT NULL,
    "tarifa" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "tarifas_envio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tarifas_envio_destino_key" ON "tarifas_envio"("destino");
