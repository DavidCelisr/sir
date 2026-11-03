-- CreateTable
CREATE TABLE "CodigoRecuperacion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "usadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoRecuperacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodigoRecuperacion_usuarioId_idx" ON "CodigoRecuperacion"("usuarioId");

-- CreateIndex
CREATE INDEX "CodigoRecuperacion_empresaId_idx" ON "CodigoRecuperacion"("empresaId");

-- AddForeignKey
ALTER TABLE "CodigoRecuperacion" ADD CONSTRAINT "CodigoRecuperacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoRecuperacion" ADD CONSTRAINT "CodigoRecuperacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un solo código sin usar por usuario: la base de datos lo garantiza
CREATE UNIQUE INDEX "CodigoRecuperacion_un_codigo_sin_usar_por_usuario"
  ON "CodigoRecuperacion" ("usuarioId") WHERE "usadoEn" IS NULL;