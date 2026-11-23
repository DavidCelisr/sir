-- la eliminación de usuarios es una inactivación lógica (activo = false).
-- Los índices únicos deben mirar solo a los usuarios ACTIVOS: la fila de un usuario eliminado
-- se conserva y no puede seguir ocupando un lugar.

-- 1. Un solo Técnico Líder ACTIVO por empresa.
--    Si el Líder se elimina, la empresa puede tener otro.
DROP INDEX "Usuario_un_tecnico_lider_por_empresa";
CREATE UNIQUE INDEX "Usuario_un_tecnico_lider_por_empresa"
  ON "Usuario" ("empresaId") WHERE "rol" = 'TECNICO_LIDER' AND "activo" = true;

-- 2. Documento único por empresa, entre usuarios activos.
--    si los usuarios tienen tipo y número en NULL: PostgreSQL trata los NULL
--    como valores distintos, así que no chocan entre sí.
CREATE UNIQUE INDEX "Usuario_documento_unico_por_empresa"
  ON "Usuario" ("empresaId", "tipoDocumento", "numeroDocumento")
  WHERE "activo" = true;