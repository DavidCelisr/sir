// Error esperado del negocio (ej. token inválido). Lleva el código HTTP
// que debe responder el controller.
export class ErrorNegocio extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}