// Validación de FORMATO en el frontend: avisa rápido al usuario, pero no sustituye
// al backend, que siempre vuelve a validar.

export const HOY = new Date().toISOString().slice(0, 10) // tope de las fechas

const vacio = (v) => !String(v ?? '').trim()
const correoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

// Fecha AAAA-MM-DD que no sea futura (mismas reglas que el backend)
function fechaValida(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const fecha = new Date(v)
  return !isNaN(fecha) && fecha <= new Date()
}

// Devuelve { campo: 'mensaje' } para los campos obligatorios vacíos
function exigir(datos, campos) {
  const errores = {}
  for (const campo of campos) {
    if (vacio(datos[campo])) errores[campo] = 'Este campo es obligatorio'
  }
  return errores
}

// Campos que se piden tanto al representante legal como a la persona natural
const CAMPOS_RESPONSABLE = [
  'nombres', 'apellidos', 'tipoDocumento', 'numeroDocumento',
  'fechaExpedicion', 'telefono', 'correo', 'direccion',
]

function revisarResponsable(datos, extras = []) {
  const errores = exigir(datos, [...CAMPOS_RESPONSABLE, ...extras])
  if (!errores.correo && !correoValido(datos.correo.trim())) {
    errores.correo = 'El correo no tiene un formato válido'
  }
  if (!errores.fechaExpedicion && !fechaValida(datos.fechaExpedicion)) {
    errores.fechaExpedicion = 'Ingrese una fecha válida que no sea futura'
  }
  return errores
}

// Revisa el paso actual. Devuelve {} si todo está bien.
export function validar(paso, datos, aceptaTerminos) {
  switch (paso) {
    case 'empresa': // persona jurídica: datos de la empresa
      return exigir(datos, ['numeroIdentificacion', 'digitoVerificacion', 'razonSocial', 'departamento', 'ciudad'])
    case 'datos': // persona natural: todo en un paso
      return revisarResponsable(datos, ['nacionalidad1', 'paisNacimiento', 'ciudadNacimiento', 'profesionOcupacion', 'departamento', 'ciudad'])
    case 'terminos':
      return aceptaTerminos ? {} : { terminos: 'Debe aceptar para continuar' }
    case 'representante': // persona jurídica: representante legal
      return revisarResponsable(datos)
    default:
      return {}
  }
}