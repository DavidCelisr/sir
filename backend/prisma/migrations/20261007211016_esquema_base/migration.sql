-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CEDULA_CIUDADANIA', 'CARNET_DIPLOMATICO', 'CEDULA_EXTRANJERIA', 'NIT', 'PERMISO_ESPECIAL_PERMANENCIA', 'PERMISO_PROTECCION_TEMPORAL', 'REGISTRO_CIVIL', 'SALVOCONDUCTO_PERMANENCIA', 'TARJETA_IDENTIDAD', 'NUIP');

-- CreateEnum
CREATE TYPE "TipoAfiliacion" AS ENUM ('PERSONA_NATURAL', 'PERSONA_JURIDICA');

-- CreateEnum
CREATE TYPE "EstadoEmpresa" AS ENUM ('ACTIVA', 'INACTIVA');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMINISTRADOR', 'TECNICO_LIDER', 'TECNICO');

-- CreateTable
CREATE TABLE "Superadministrador" (
    "id" SERIAL NOT NULL,
    "nombreUsuario" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Superadministrador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "numeroContrato" SERIAL NOT NULL,
    "tipoAfiliacion" "TipoAfiliacion" NOT NULL,
    "tipoIdentificacion" "TipoDocumento" NOT NULL,
    "numeroIdentificacion" TEXT NOT NULL,
    "digitoVerificacion" TEXT,
    "consecutivo" TEXT,
    "razonSocial" TEXT,
    "departamento" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "estado" "EstadoEmpresa" NOT NULL DEFAULT 'ACTIVA',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Responsable" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "fechaExpedicion" DATE NOT NULL,
    "telefono" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "nacionalidad1" TEXT,
    "nacionalidad2" TEXT,
    "paisNacimiento" TEXT,
    "ciudadNacimiento" TEXT,
    "profesionOcupacion" TEXT,

    CONSTRAINT "Responsable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitacion" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadaEn" TIMESTAMP(3),
    "empresaId" INTEGER,

    CONSTRAINT "Invitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreUsuario" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Superadministrador_nombreUsuario_key" ON "Superadministrador"("nombreUsuario");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_numeroContrato_key" ON "Empresa"("numeroContrato");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_tipoIdentificacion_numeroIdentificacion_key" ON "Empresa"("tipoIdentificacion", "numeroIdentificacion");

-- CreateIndex
CREATE UNIQUE INDEX "Responsable_empresaId_key" ON "Responsable"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitacion_token_key" ON "Invitacion"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Invitacion_empresaId_key" ON "Invitacion"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_nombreUsuario_key" ON "Usuario"("nombreUsuario");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_idx" ON "Usuario"("empresaId");

-- AddForeignKey
ALTER TABLE "Responsable" ADD CONSTRAINT "Responsable_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
