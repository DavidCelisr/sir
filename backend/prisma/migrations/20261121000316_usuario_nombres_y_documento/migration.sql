-- nombres, apellidos y documento propio de cada usuario.

-- 1. Columnas nuevas, todas vacías por ahora
ALTER TABLE "Usuario"
  ADD COLUMN "nombres" TEXT,
  ADD COLUMN "apellidos" TEXT,
  ADD COLUMN "tipoDocumento" "TipoDocumento",
  ADD COLUMN "numeroDocumento" TEXT;

-- 2. Administradores: sus datos salen del responsable registrado de su empresa
--    (el administrador es el representante legal, o la propia persona en persona natural)
UPDATE "Usuario" u
SET "nombres" = r."nombres",
    "apellidos" = r."apellidos",
    "tipoDocumento" = r."tipoDocumento",
    "numeroDocumento" = r."numeroDocumento"
FROM "Responsable" r
WHERE r."empresaId" = u."empresaId" AND u."rol" = 'ADMINISTRADOR';

-- 3. Los demás usuarios (Técnico Líder y Técnicos): su nombre completo pasa a "nombres".
--    No se pueden separar los apellidos con seguridad y no tienen documento registrado:
--    esas columnas quedan vacías y cada usuario completa sus apellidos en "Actualizar datos".
UPDATE "Usuario" SET "nombres" = "nombre" WHERE "nombres" IS NULL;

-- 4. Todos los usuarios ya tienen nombres, así que ahora es obligatorio
ALTER TABLE "Usuario" ALTER COLUMN "nombres" SET NOT NULL;