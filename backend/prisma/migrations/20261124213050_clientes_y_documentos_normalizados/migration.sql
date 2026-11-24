-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT,
    "telefono" TEXT,
    "ciudad" TEXT,
    "direccion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_empresaId_tipoDocumento_numeroDocumento_key" ON "Cliente"("empresaId", "tipoDocumento", "numeroDocumento");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- el número de documento se guarda SIEMPRE normalizado (mayúsculas, sin espacios, puntos
-- ni guiones), y la base de datos lo garantiza. Sin esto, "1012345678" y "1.012.345.678" serían
-- dos clientes distintos

-- 1. Cliente
ALTER TABLE "Cliente"
  ADD CONSTRAINT "Cliente_documento_normalizado" CHECK ("numeroDocumento" ~ '^[A-Z0-9]{3,20}$');

-- 2. Usuario: se comprueba que la normalización NO genere duplicados entre usuarios activos
--    (el índice único "Usuario_documento_unico_por_empresa" solo mira a los activos).
DO $$
DECLARE duplicados INT;
BEGIN
  SELECT COUNT(*) INTO duplicados FROM (
    SELECT 1 FROM "Usuario"
    WHERE "activo" = true AND "numeroDocumento" IS NOT NULL
    GROUP BY "empresaId", "tipoDocumento", upper(regexp_replace("numeroDocumento", '[[:space:].-]', '', 'g'))
    HAVING COUNT(*) > 1
  ) d;
  IF duplicados > 0 THEN
    RAISE EXCEPTION 'Hay % grupo(s) de usuarios activos que quedarían con el mismo documento al normalizarlo. Corríjalos antes de migrar', duplicados;
  END IF;
END $$;

-- 3. Usuario: se normalizan los documentos existentes
UPDATE "Usuario"
SET "numeroDocumento" = upper(regexp_replace("numeroDocumento", '[[:space:].-]', '', 'g'))
WHERE "numeroDocumento" IS NOT NULL;

-- 4. Usuario: desde ahora el documento solo puede guardarse normalizado
ALTER TABLE "Usuario"
  ADD CONSTRAINT "Usuario_documento_normalizado" CHECK ("numeroDocumento" IS NULL OR "numeroDocumento" ~ '^[A-Z0-9]{3,20}$');