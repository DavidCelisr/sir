// Documento normalizado: mayúsculas y sin espacios ni separadores.
export const normalizarDocumento = (valor) =>
  typeof valor === 'string' ? valor.toUpperCase().replace(/[\s.-]/g, '') : '';

// Formato válido DESPUÉS de normalizar: solo letras y números, de 3 a 20 caracteres.
export const DOCUMENTO_VALIDO = /^[A-Z0-9]{3,20}$/;

// Mensaje común para todos los validadores
export const MSG_DOCUMENTO = 'debe tener de 3 a 20 caracteres: letras y números (se ignoran espacios, puntos y guiones)';