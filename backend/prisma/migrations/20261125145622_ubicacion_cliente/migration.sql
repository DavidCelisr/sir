-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "departamento" TEXT;

-- AlterTable
ALTER TABLE "Cotizacion" ADD COLUMN     "clienteDepartamento" TEXT;

-- si hay departamento, tiene que haber ciudad. No se exige lo contrario: los clientes y las
-- cotizaciones anteriores tienen la ciudad escrita a mano y sin departamento, y deben seguir siendo válidos.
ALTER TABLE "Cliente"
  ADD CONSTRAINT "Cliente_departamento_con_ciudad" CHECK ("departamento" IS NULL OR "ciudad" IS NOT NULL);

ALTER TABLE "Cotizacion"
  ADD CONSTRAINT "Cotizacion_departamento_con_ciudad" CHECK ("clienteDepartamento" IS NULL OR "clienteCiudad" IS NOT NULL);