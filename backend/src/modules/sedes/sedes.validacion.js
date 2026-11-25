import { errorUbicacion } from '../../lib/ubicacion.js';

export const LIMITE_SEDES = 50; // sedes activas por empresa

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
// Recorta y colapsa los espacios repetidos: "  Sede   01 " -> "Sede 01"
const limpio = (v) => texto(v).replace(/\s+/g, ' ');

// El id llega por la URL (/sedes/:id). Devuelve el número o null si no es válido.
export function validarIdSede(valor) {
  const id = Number(valor);
  return /^\d+$/.test(valor) && id > 0 && id <= 2147483647 ? id : null;
}

// Alta y edición de una sede. Aquí NO se leen empresaId, esPrincipal ni activo: se ignoran a propósito
// La sede principal solo se cambia con «Designar como principal».
// Datos: nombre o código, dirección (opcional), departamento y ciudad (obligatorios y coherentes entre sí).
export function validarSede(body = {}) {
  const errores = [];

  const nombre = limpio(body.nombre);
  const direccion = limpio(body.direccion) || null;
  const departamento = limpio(body.departamento);
  const ciudad = limpio(body.ciudad);

  if (!nombre) errores.push('nombre es obligatorio');
  else if (nombre.length > 80) errores.push('nombre no puede pasar de 80 caracteres');
  if (direccion && direccion.length > 200) errores.push('direccion no puede pasar de 200 caracteres');

  if (!departamento) errores.push('departamento es obligatorio');
  if (!ciudad) errores.push('ciudad es obligatoria');
  if (departamento && ciudad) {
    const errorSitio = errorUbicacion(departamento, ciudad); // la ciudad debe pertenecer al departamento
    if (errorSitio) errores.push(errorSitio);
  }

  return { errores, datos: { nombre, direccion, departamento, ciudad } };
}