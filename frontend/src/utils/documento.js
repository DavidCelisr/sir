// Mismo criterio que el backend (src/lib/documentos.js): mayúsculas, sin espacios, puntos ni guiones.
// El backend siempre vuelve a normalizar; aquí sirve para validar antes de enviar.
export const normalizarDocumento = (valor) => valor.toUpperCase().replace(/[\s.-]/g, '')

export const DOCUMENTO_VALIDO = /^[A-Z0-9]{3,20}$/
export const MSG_DOCUMENTO = 'Debe tener de 3 a 20 caracteres: letras y números (se ignoran espacios, puntos y guiones)'