// Modificacion. El campo "nombre" de Usuario
// se genera siempre así y nunca lo envía el cliente
export const nombreCompleto = (nombres, apellidos) => [nombres, apellidos].filter(Boolean).join(' ');