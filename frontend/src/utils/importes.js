import { LIMITE_CANTIDAD } from '../constants/cotizaciones.js'

// Convierte importe a string decimal con punto o null; rechaza separadores de miles.
export function importeValido(texto) {
  const limpio = texto.trim().replace(',', '.')
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(limpio)) return null
  return Number(limpio) > 0 ? limpio : null
}

// Aritmética exacta en CENTAVOS con BigInt: evita los errores de los decimales de JavaScript.
// El backend calcula el total definitivo; esto es solo la vista previa mientras se arma la cotización.
export function aCentavos(importe) { // "120000.5" -> 12000050n
  const [entera, decimales = ''] = importe.split('.')
  return BigInt(entera) * 100n + BigInt(decimales.padEnd(2, '0'))
}

export function deCentavos(centavos) { // 12000050n -> "120000.50"
  return `${centavos / 100n}.${String(centavos % 100n).padStart(2, '0')}`
}

// Una cantidad válida es un entero entre 1 y el límite (se guarda como texto mientras se escribe)
export const cantidadValida = (texto) =>
  /^\d{1,5}$/.test(texto) && Number(texto) >= 1 && Number(texto) <= LIMITE_CANTIDAD

// Una línea tiene: cantidad (texto) y precioUnitario (texto). Los servicios llevan cantidad "1".
// Subtotal en centavos, o null si la cantidad todavía no es válida.
export function subtotalDe(linea) {
  if (!cantidadValida(linea.cantidad)) return null
  return aCentavos(linea.precioUnitario) * BigInt(linea.cantidad)
}

export const totalDe = (lineas) => lineas.reduce((suma, l) => suma + (subtotalDe(l) ?? 0n), 0n)