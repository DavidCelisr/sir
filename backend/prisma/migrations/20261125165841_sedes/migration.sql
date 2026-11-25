-- CreateTable
CREATE TABLE "Sede" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "departamento" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sede_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sede_empresaId_idx" ON "Sede"("empresaId");

-- AddForeignKey
ALTER TABLE "Sede" ADD CONSTRAINT "Sede_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reglas de las sedes que Prisma no puede expresar.

-- 1. Cada empresa ya registrada recibe su "Sede principal", con el departamento y la ciudad con que se
--    registró. Se copian tal cual, sin validarlos contra las listas: las empresas registradas antes de las
--    listas pueden tener texto libre, y la sede se corrige después desde las listas.
INSERT INTO "Sede" ("empresaId", "nombre", "departamento", "ciudad", "esPrincipal")
SELECT e."id", 'Sede principal', e."departamento", e."ciudad", true FROM "Empresa" e;

-- 2. Una sola sede principal por empresa
CREATE UNIQUE INDEX "Sede_una_principal_por_empresa"
  ON "Sede" ("empresaId") WHERE "esPrincipal" = true;

-- 3. La principal siempre está activa: la base de datos rechaza inactivar una sede que sea principal.
--    Para eliminarla, primero se designa otra como principal.
ALTER TABLE "Sede"
  ADD CONSTRAINT "Sede_principal_activa" CHECK (NOT "esPrincipal" OR "activo");

-- 4. Nombre único por empresa entre las sedes ACTIVAS, sin distinguir mayúsculas.
--    El nombre de una sede eliminada queda libre.
CREATE UNIQUE INDEX "Sede_nombre_unico_por_empresa"
  ON "Sede" ("empresaId", lower("nombre")) WHERE "activo" = true;