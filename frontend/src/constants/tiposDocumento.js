// Tipos de documento aceptados. Los valores deben coincidir EXACTAMENTE
// con el enum TipoDocumento de prisma/schema.prisma.
// 'numero' es el nombre que toma el campo del número según el tipo elegido.
export const TIPOS_DOCUMENTO = [
  { valor: 'CEDULA_CIUDADANIA', etiqueta: 'Cédula de ciudadanía', numero: 'Número de cédula de ciudadanía' },
  { valor: 'CARNET_DIPLOMATICO', etiqueta: 'Carnet diplomático', numero: 'Número de carnet diplomático' },
  { valor: 'CEDULA_EXTRANJERIA', etiqueta: 'Cédula de extranjería', numero: 'Número de cédula de extranjería' },
  { valor: 'NIT', etiqueta: 'NIT', numero: 'Número de NIT' },
  { valor: 'PERMISO_ESPECIAL_PERMANENCIA', etiqueta: 'Permiso especial de permanencia', numero: 'Número de permiso especial de permanencia' },
  { valor: 'PERMISO_PROTECCION_TEMPORAL', etiqueta: 'Permiso por protección temporal', numero: 'Número de permiso por protección temporal' },
  { valor: 'REGISTRO_CIVIL', etiqueta: 'Registro civil de nacimiento', numero: 'Número de registro civil' },
  { valor: 'SALVOCONDUCTO_PERMANENCIA', etiqueta: 'Salvoconducto de permanencia', numero: 'Número de salvoconducto' },
  { valor: 'TARJETA_IDENTIDAD', etiqueta: 'Tarjeta de identidad', numero: 'Número de tarjeta de identidad' },
  { valor: 'NUIP', etiqueta: 'NUIP', numero: 'Número de NUIP' },
]

// Etiqueta del campo "número" según el tipo elegido
export const etiquetaNumero = (valor) =>
  TIPOS_DOCUMENTO.find((t) => t.valor === valor)?.numero ?? 'Número de documento'