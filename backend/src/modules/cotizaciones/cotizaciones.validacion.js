import prismaClient from '@prisma/client';
import { normalizarDocumento, DOCUMENTO_VALIDO, MSG_DOCUMENTO } from '../../lib/documentos.js';
import { errorUbicacion } from '../../lib/ubicacion.js';

const { TipoDocumento } = prismaClient;
const TIPOS_DOCUMENTO = Object.values(TipoDocumento);
const TIPOS_SERVICIO = ['SERVICIO_BASICO', 'SERVICIO_ESPECIALIZADO'];

export const POR_PAGINA = 25; // cotizaciones por página
export const LIMITE_LINEAS = 50;
const LIMITE_CANTIDAD = 10000;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
// Recorta y colapsa los espacios repetidos: "  Ana   Gómez " -> "Ana Gómez"
const limpio = (v) => texto(v).replace(/\s+/g, ' ');
const correoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Convierte a entero: acepta 5 o "5". Devuelve NaN si no lo es.
function entero(valor) {
  if (typeof valor === 'number') return Number.isInteger(valor) ? valor : NaN;
  if (typeof valor === 'string' && /^-?\d+$/.test(valor.trim())) return Number(valor.trim());
  return NaN;
}

// Importe como texto ("285000" o "120000.50"): mayor que 0, hasta 10 dígitos enteros y 2 decimales
// (mismo formato que el inventario). Devuelve null si no es válido. Nunca se usa un decimal de JavaScript.
function importe(valor) {
  const t = typeof valor === 'number' ? String(valor) : texto(valor);
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(t)) return null;
  return Number(t) > 0 ? t : null;
}

// El id llega por la URL (/cotizaciones/:id). Devuelve el número o null si no es válido.
export function validarIdCotizacion(valor) {
  const id = Number(valor);
  return /^\d+$/.test(valor) && id > 0 && id <= 2147483647 ? id : null;
}

// Listado: la búsqueda y el filtro por sede son opcionales (por número, nombre o documento del cliente); la
// página, desde 1. El filtro por sede es por IDENTIFICADOR: un renombre de la sede no la divide en dos.
export function validarConsulta(query = {}) {
  const errores = [];

  if (query.busqueda !== undefined && typeof query.busqueda !== 'string') errores.push('busqueda no es válida');
  const busqueda = limpio(query.busqueda);
  if (busqueda.length > 60) errores.push('busqueda no puede pasar de 60 caracteres');

  let pagina = 1;
  if (query.pagina !== undefined) {
    pagina = typeof query.pagina === 'string' && /^\d+$/.test(query.pagina) ? Number(query.pagina) : NaN;
    if (!Number.isInteger(pagina) || pagina < 1 || pagina > 100000) {
      errores.push('pagina debe ser un entero mayor o igual a 1');
    }
  }

  let sedeId = null;
  if (query.sedeId !== undefined && query.sedeId !== '') {
    sedeId = typeof query.sedeId === 'string' && /^\d+$/.test(query.sedeId) ? Number(query.sedeId) : NaN;
    if (!Number.isInteger(sedeId) || sedeId < 1 || sedeId > 2147483647) errores.push('sedeId no es válido');
  }

  return { errores, datos: { busqueda, pagina, sedeId } };
}

// Búsqueda de piezas para armar la cotización (nombre o código)
export function validarBusquedaPiezas(query = {}) {
  const errores = [];
  if (query.busqueda !== undefined && typeof query.busqueda !== 'string') errores.push('busqueda no es válida');
  const busqueda = limpio(query.busqueda);
  if (busqueda.length > 60) errores.push('busqueda no puede pasar de 60 caracteres');
  return { errores, datos: { busqueda } };
}

// Revisa una línea y devuelve su forma limpia. n = posición (1, 2, 3…) para los mensajes.
function validarLinea(l, n, errores) {
  if (!l || typeof l !== 'object' || Array.isArray(l)) {
    errores.push(`línea ${n}: no es válida`);
    return null;
  }

  if (l.tipo === 'PIEZA') {
    const piezaId = entero(l.piezaId);
    const cantidad = entero(l.cantidad);
    const precioUnitario = importe(l.precioUnitario); // el precio que vio quien cotiza

    if (!Number.isInteger(piezaId) || piezaId < 1 || piezaId > 2147483647) errores.push(`línea ${n}: piezaId no es válido`);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > LIMITE_CANTIDAD) {
      errores.push(`línea ${n}: cantidad debe ser un entero entre 1 y ${LIMITE_CANTIDAD}`);
    }
    if (precioUnitario === null) {
      errores.push(`línea ${n}: precioUnitario debe ser un número mayor que 0, con hasta 2 decimales`);
    }
    return { tipo: 'PIEZA', piezaId, cantidad, precioUnitario };
  }

  if (TIPOS_SERVICIO.includes(l.tipo)) {
    const descripcion = limpio(l.descripcion);
    const valor = importe(l.valor);

    if (!descripcion) errores.push(`línea ${n}: descripcion es obligatoria`);
    else if (descripcion.length > 200) errores.push(`línea ${n}: descripcion no puede pasar de 200 caracteres`);
    if (valor === null) errores.push(`línea ${n}: valor debe ser un número mayor que 0, con hasta 2 decimales`);
    return { tipo: l.tipo, descripcion, valor };
  }

  errores.push(`línea ${n}: tipo debe ser PIEZA, SERVICIO_BASICO o SERVICIO_ESPECIALIZADO`);
  return null;
}

// Crear cotización: empresaId, numero, total y creador los determina el servidor. Solo se valida el
// formato del cliente; si ya existe, se usan sus datos almacenados. La sede se identifica por sedeId.
export function validarCotizacion(body = {}) {
  const errores = [];
  const c = body.cliente && typeof body.cliente === 'object' && !Array.isArray(body.cliente) ? body.cliente : {};

  const cliente = {
    tipoDocumento: c.tipoDocumento,
    numeroDocumento: normalizarDocumento(c.numeroDocumento),
    nombre: limpio(c.nombre) || null,
    correo: texto(c.correo) || null,
    telefono: limpio(c.telefono) || null,
    departamento: limpio(c.departamento) || null, // departamento de RESIDENCIA del cliente
    ciudad: limpio(c.ciudad) || null, // ciudad de RESIDENCIA del cliente
    direccion: limpio(c.direccion) || null,
  };

  if (!TIPOS_DOCUMENTO.includes(cliente.tipoDocumento)) errores.push('cliente.tipoDocumento no es un tipo de documento válido');
  if (!DOCUMENTO_VALIDO.test(cliente.numeroDocumento)) errores.push(`cliente.numeroDocumento ${MSG_DOCUMENTO}`);
  if (cliente.nombre && cliente.nombre.length > 150) errores.push('cliente.nombre no puede pasar de 150 caracteres');
  if (cliente.correo && (cliente.correo.length > 120 || !correoValido(cliente.correo))) errores.push('cliente.correo no tiene un formato válido');
  if (cliente.telefono && !/^[0-9+()\s-]{7,20}$/.test(cliente.telefono)) errores.push('cliente.telefono no tiene un formato válido');
  const errorSitio = errorUbicacion(cliente.departamento, cliente.ciudad, 'cliente');
  if (errorSitio) errores.push(errorSitio);
  if (cliente.direccion && cliente.direccion.length > 200) errores.push('cliente.direccion no puede pasar de 200 caracteres');

  const sedeId = entero(body.sedeId); // sede de servicio 
  if (!Number.isInteger(sedeId) || sedeId < 1 || sedeId > 2147483647) errores.push('sedeId es obligatorio y debe ser el id de una sede');

  const diagnostico = texto(body.diagnostico); // se conservan los saltos de línea
  if (!diagnostico) errores.push('diagnostico es obligatorio');
  else if (diagnostico.length > 2000) errores.push('diagnostico no puede pasar de 2000 caracteres');

  let lineas = [];
  if (!Array.isArray(body.lineas) || body.lineas.length === 0) {
    errores.push('lineas debe incluir al menos una pieza o un servicio');
  } else if (body.lineas.length > LIMITE_LINEAS) {
    errores.push(`lineas no puede pasar de ${LIMITE_LINEAS} líneas`);
  } else {
    lineas = body.lineas.map((l, i) => validarLinea(l, i + 1, errores));
  }

  return { errores, datos: { cliente, sedeId, diagnostico, lineas } };
}