ALTER SEQUENCE "Empresa_numeroContrato_seq" RESTART WITH 10001;

CREATE UNIQUE INDEX "Usuario_un_administrador_por_empresa"
  ON "Usuario" ("empresaId") WHERE "rol" = 'ADMINISTRADOR';

CREATE UNIQUE INDEX "Usuario_un_tecnico_lider_por_empresa"
  ON "Usuario" ("empresaId") WHERE "rol" = 'TECNICO_LIDER';-- This is an empty migration.