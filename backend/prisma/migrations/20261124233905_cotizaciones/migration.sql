-- CreateEnum
CREATE TYPE "TipoLineaCotizacion" AS ENUM ('PIEZA', 'SERVICIO_BASICO', 'SERVICIO_ESPECIALIZADO');

-- CreateTable
CREATE TABLE "ContadorCotizacion" (
    "empresaId" INTEGER NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContadorCotizacion_pkey" PRIMARY KEY ("empresaId")
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "clienteTipoDocumento" "TipoDocumento" NOT NULL,
    "clienteNumeroDocumento" TEXT NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "clienteCorreo" TEXT,
    "clienteTelefono" TEXT,
    "clienteCiudad" TEXT,
    "clienteDireccion" TEXT,
    "ciudadServicio" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "creadaPorId" INTEGER NOT NULL,
    "creadaPorNombre" TEXT NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionLinea" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" "TipoLineaCotizacion" NOT NULL,
    "piezaId" INTEGER,
    "codigo" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "CotizacionLinea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cotizacion_empresaId_creadaEn_idx" ON "Cotizacion"("empresaId", "creadaEn");

-- CreateIndex
CREATE INDEX "Cotizacion_clienteId_idx" ON "Cotizacion"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Cotizacion_empresaId_numero_key" ON "Cotizacion"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "CotizacionLinea_cotizacionId_idx" ON "CotizacionLinea"("cotizacionId");

-- CreateIndex
CREATE INDEX "CotizacionLinea_piezaId_idx" ON "CotizacionLinea"("piezaId");

-- AddForeignKey
ALTER TABLE "ContadorCotizacion" ADD CONSTRAINT "ContadorCotizacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionLinea" ADD CONSTRAINT "CotizacionLinea_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionLinea" ADD CONSTRAINT "CotizacionLinea_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "Pieza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- reglas que Prisma no puede expresar.

-- 1. Valores coherentes. La base de datos los exige aunque falle una validación del servicio.
ALTER TABLE "ContadorCotizacion"
  ADD CONSTRAINT "ContadorCotizacion_no_negativo" CHECK ("ultimo" >= 0);

ALTER TABLE "Cotizacion"
  ADD CONSTRAINT "Cotizacion_numero_positivo" CHECK ("numero" > 0),
  ADD CONSTRAINT "Cotizacion_total_positivo" CHECK ("total" > 0),
  ADD CONSTRAINT "Cotizacion_documento_normalizado" CHECK ("clienteNumeroDocumento" ~ '^[A-Z0-9]{3,20}$');

ALTER TABLE "CotizacionLinea"
  ADD CONSTRAINT "CotizacionLinea_cantidad_positiva" CHECK ("cantidad" >= 1),
  ADD CONSTRAINT "CotizacionLinea_precio_positivo" CHECK ("precioUnitario" > 0),
  ADD CONSTRAINT "CotizacionLinea_subtotal_exacto" CHECK ("subtotal" = "cantidad" * "precioUnitario"),
  -- una línea de pieza apunta a una pieza; una de servicio, no
  ADD CONSTRAINT "CotizacionLinea_pieza_coherente" CHECK (
    ("tipo" = 'PIEZA' AND "piezaId" IS NOT NULL) OR ("tipo" <> 'PIEZA' AND "piezaId" IS NULL)
  ),
  -- un servicio es una sola unidad
  ADD CONSTRAINT "CotizacionLinea_servicio_una_unidad" CHECK ("tipo" = 'PIEZA' OR "cantidad" = 1);

-- 2. Inmutabilidad: una cotización y sus líneas no se pueden actualizar ni eliminar.
--    Vale aunque alguien llegue directamente a la base de datos, sin pasar por el servidor.
CREATE FUNCTION "rechazar_cambios_cotizacion"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Las cotizaciones no se pueden modificar ni eliminar (RN-10, RN-34)';
END;
$$;

CREATE TRIGGER "Cotizacion_inmutable"
  BEFORE UPDATE OR DELETE ON "Cotizacion"
  FOR EACH ROW EXECUTE FUNCTION "rechazar_cambios_cotizacion"();

CREATE TRIGGER "CotizacionLinea_inmutable"
  BEFORE UPDATE OR DELETE ON "CotizacionLinea"
  FOR EACH ROW EXECUTE FUNCTION "rechazar_cambios_cotizacion"();