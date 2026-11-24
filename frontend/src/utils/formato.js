// Formato de pesos colombianos. El backend envía el precio como TEXTO, y el frontend lo convierte a número para poder formatearlo con separador de miles y símbolo de pesos. Ejemplo: "12500" -> 12.500,00 -> "$ 12.500,00"
export function pesos(valor) {
  const cifra = Number(valor)
  if (!Number.isFinite(cifra)) return ''
  const conCentavos = !Number.isInteger(cifra)
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: conCentavos ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cifra)
}

// Número con separador de miles: 12500 -> "12.500"
export const numero = (valor) => new Intl.NumberFormat('es-CO').format(valor)

// Fecha y hora en la zona horaria del navegador (el backend guarda todo en UTC)
const FECHA_HORA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
export const fechaHora = (iso) => FECHA_HORA.format(new Date(iso))