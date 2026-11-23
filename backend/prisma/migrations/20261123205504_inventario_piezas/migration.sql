-- CreateEnum
CREATE TYPE "TipoMovimientoPieza" AS ENUM ('ALTA', 'AJUSTE', 'CAMBIO_PRECIO');

-- CreateTable
CREATE TABLE "Pieza" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "unidades" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoPieza" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "piezaId" INTEGER NOT NULL,
    "tipo" "TipoMovimientoPieza" NOT NULL,
    "cantidad" INTEGER,
    "unidadesAntes" INTEGER,
    "unidadesDespues" INTEGER,
    "precioAntes" DECIMAL(12,2),
    "precioDespues" DECIMAL(12,2),
    "usuarioId" INTEGER,
    "usuarioNombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoPieza_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pieza_empresaId_idx" ON "Pieza"("empresaId");

-- CreateIndex
CREATE INDEX "MovimientoPieza_piezaId_creadoEn_idx" ON "MovimientoPieza"("piezaId", "creadoEn");

-- CreateIndex
CREATE INDEX "MovimientoPieza_empresaId_idx" ON "MovimientoPieza"("empresaId");

-- AddForeignKey
ALTER TABLE "Pieza" ADD CONSTRAINT "Pieza_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoPieza" ADD CONSTRAINT "MovimientoPieza_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoPieza" ADD CONSTRAINT "MovimientoPieza_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "Pieza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoPieza" ADD CONSTRAINT "MovimientoPieza_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- reglas necesarias que Prisma no puede expresar y se implementan directamente en la base de datos.

-- Código único por empresa entre las piezas ACTIVAS, sin distinguir mayúsculas.
-- Una pieza eliminada libera su código. Las piezas sin código no chocan entre sí.
CREATE UNIQUE INDEX "Pieza_codigo_unico_por_empresa"
  ON "Pieza" ("empresaId", lower("codigo"))
  WHERE "activo" = true AND "codigo" IS NOT NULL;

-- Las existencias, el mínimo y el precio nunca son negativos. La base de datos lo garantiza
-- aunque falle una validación del servicio.
ALTER TABLE "Pieza"
  ADD CONSTRAINT "Pieza_unidades_no_negativas" CHECK ("unidades" >= 0),
  ADD CONSTRAINT "Pieza_stock_minimo_no_negativo" CHECK ("stockMinimo" >= 0),
  ADD CONSTRAINT "Pieza_precio_no_negativo" CHECK ("precioUnitario" >= 0);