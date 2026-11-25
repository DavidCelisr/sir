-- AlterTable
ALTER TABLE "Cotizacion" ADD COLUMN     "sedeCiudad" TEXT,
ADD COLUMN     "sedeDepartamento" TEXT,
ADD COLUMN     "sedeDireccion" TEXT,
ADD COLUMN     "sedeId" INTEGER,
ADD COLUMN     "sedeNombre" TEXT,
ALTER COLUMN "ciudadServicio" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Cotizacion_empresaId_sedeId_idx" ON "Cotizacion"("empresaId", "sedeId");

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- o es una cotización NUEVA (con sede, su copia y sin ciudad del servicio) o una ANTERIOR (sin sede y con
-- ciudad del servicio). Nunca una mezcla. Las cotizaciones existentes ya cumplen la segunda forma.
ALTER TABLE "Cotizacion"
  ADD CONSTRAINT "Cotizacion_sede_coherente" CHECK (
    ("sedeId" IS NOT NULL AND "sedeNombre" IS NOT NULL AND "sedeDepartamento" IS NOT NULL
       AND "sedeCiudad" IS NOT NULL AND "ciudadServicio" IS NULL)
    OR
    ("sedeId" IS NULL AND "sedeNombre" IS NULL AND "sedeDireccion" IS NULL AND "sedeDepartamento" IS NULL
       AND "sedeCiudad" IS NULL AND "ciudadServicio" IS NOT NULL)
  );