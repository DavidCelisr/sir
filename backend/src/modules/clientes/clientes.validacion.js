import prismaClient from '@prisma/client';
import { normalizarDocumento, DOCUMENTO_VALIDO, MSG_DOCUMENTO } from '../../lib/documentos.js';
import { errorUbicacion } from '../../lib/ubicacion.js';

const { TipoDocumento } = prismaClient;
const TIPOS = Object.values(TipoDocumento);

export const POR_PAGINA = 25; // clientes por página
const MINIMO_BUSQUEDA = 2; // la búsqueda exige al menos 2 caracteres (provisional, se puede cambiar si se quiere)

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
// Recorta y colapsa los espacios repetidos: "  Ana   Gómez " -> "Ana Gómez"
const limpio = (v) => texto(v).replace(/\s+/g, ' ');
const correoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// El id llega por la URL (/clientes/:id). Devuelve el número o null si no es válido.
export function validarIdCliente(valor) {
  const id = Number(valor);
  return /^\d+$/.test(valor) && id > 0 && id <= 2147483647 ? id : null;
}

// Búsqueda general: por nombre o por documento. Es obligatoria: este módulo no lista a todos los
// clientes, solo los localiza.
export function validarBusqueda(query = {}) {
  const errores = [];
  const busqueda = typeof query.busqueda === 'string' ? limpio(query.busqueda) : '';

  if (busqueda.length < MINIMO_BUSQUEDA) errores.push(`busqueda debe tener al menos ${MINIMO_BUSQUEDA} caracteres`);
  else if (busqueda.length > 60) errores.push('busqueda no puede pasar de 60 caracteres');

  let pagina = 1;
  if (query.pagina !== undefined) {
    pagina = typeof query.pagina === 'string' && /^\d+$/.test(query.pagina) ? Number(query.pagina) : NaN;
    if (!Number.isInteger(pagina) || pagina < 1 || pagina > 100000) {
      errores.push('pagina debe ser un entero mayor o igual a 1');
    }
  }
  return { errores, datos: { busqueda, pagina } };
}

// Consulta por tipo y número de documento (para recuperar un cliente al crear una cotización o un caso)
export function validarDocumentoConsulta(query = {}) {
  const errores = [];
  const tipoDocumento = query.tipoDocumento;
  const numeroDocumento = normalizarDocumento(query.numeroDocumento);

  if (!TIPOS.includes(tipoDocumento)) errores.push('tipoDocumento no es un tipo de documento válido');
  if (!DOCUMENTO_VALIDO.test(numeroDocumento)) errores.push(`numeroDocumento ${MSG_DOCUMENTO}`);
  return { errores, datos: { tipoDocumento, numeroDocumento } };
}

// Actualiza los datos del cliente. No se lee empresaId.
// Reemplaza todos los datos; los campos opcionales vacíos se guardan como null.
// Departamento y ciudad son opcionales, pero deben enviarse juntos y ser coherentes.
export function validarCliente(body = {}) {
  const errores = [];

  const tipoDocumento = body.tipoDocumento;
  const numeroDocumento = normalizarDocumento(body.numeroDocumento);
  const nombre = limpio(body.nombre);
  const correo = texto(body.correo) || null;
  const telefono = limpio(body.telefono) || null;
  const departamento = limpio(body.departamento) || null;
  const ciudad = limpio(body.ciudad) || null;
  const direccion = limpio(body.direccion) || null;

  if (!TIPOS.includes(tipoDocumento)) errores.push('tipoDocumento no es un tipo de documento válido');
  if (!DOCUMENTO_VALIDO.test(numeroDocumento)) errores.push(`numeroDocumento ${MSG_DOCUMENTO}`);

  if (!nombre) errores.push('nombre es obligatorio');
  else if (nombre.length > 150) errores.push('nombre no puede pasar de 150 caracteres');

  if (correo && (correo.length > 120 || !correoValido(correo))) errores.push('correo no tiene un formato válido');
  if (telefono && !/^[0-9+()\s-]{7,20}$/.test(telefono)) errores.push('telefono no tiene un formato válido');
  const errorSitio = errorUbicacion(departamento, ciudad);
  if (errorSitio) errores.push(errorSitio);
  if (direccion && direccion.length > 200) errores.push('direccion no puede pasar de 200 caracteres');

  return { errores, datos: { tipoDocumento, numeroDocumento, nombre, correo, telefono, departamento, ciudad, direccion } };
}