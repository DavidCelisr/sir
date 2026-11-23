// Tope de existencias: evita desbordamientos del tipo entero de la base de datos
export const LIMITE_UNIDADES = 1_000_000_000;
const LIMITE_AJUSTE = 1_000_000; // máximo de un solo ajuste
export const POR_PAGINA = 25; // piezas por página (provisional, lo puedo cambiar en el futuro)

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
// Recorta y colapsa los espacios repetidos: "  Pantalla   15 " -> "Pantalla 15"
const limpio = (v) => texto(v).replace(/\s+/g, ' ');

// Convierte a entero: acepta 5 o "5". Devuelve NaN si no lo es.
function entero(valor) {
  if (typeof valor === 'number') return Number.isInteger(valor) ? valor : NaN;
  if (typeof valor === 'string' && /^-?\d+$/.test(valor.trim())) return Number(valor.trim());
  return NaN;
}

// // Valida precios mayores que cero con hasta 2 decimales y aplica formato colombiano para su visualización.
function precio(valor) {
  const t = typeof valor === 'number' ? String(valor) : texto(valor);

  if (!/^\d{1,10}(\.\d{1,2})?$/.test(t)) return null;

  return Number(t) > 0 ? t : null;
}

// Formatea el precio para mostrarlo con separador de miles colombiano.
function formatoPrecio(valor) {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 2
  }).format(Number(valor));
}

// El id llega por la URL (/inventario/:id). Devuelve el número o null si no es válido.
export function validarIdPieza(valor) {
  const id = Number(valor);
  return /^\d+$/.test(valor) && id > 0 && id <= 2147483647 ? id : null;
}

// Alta y edición de una pieza. Aquí NO se lee empresaId ni activo: se ignoran a propósito
// En la edición NO se aceptan las existencias: solo cambian con un ajuste.
export function validarPieza(body = {}, { esAlta }) {
  const errores = [];

  const codigo = limpio(body.codigo) || null; // vacío = sin código
  const nombre = limpio(body.nombre);
  const precioUnitario = precio(body.precioUnitario);

  if (codigo && codigo.length > 40) errores.push('codigo no puede pasar de 40 caracteres');
  if (!nombre) errores.push('nombre es obligatorio');
  else if (nombre.length > 120) errores.push('nombre no puede pasar de 120 caracteres');
  if (precioUnitario === null) {
    errores.push('precioUnitario debe ser un número mayor que 0, con hasta 2 decimales');
  }

  // El mínimo es obligatorio al editar: si faltara, un PATCH incompleto lo dejaría en 0 sin avisar
  const minimo = body.stockMinimo ?? (esAlta ? 0 : undefined);
  const stockMinimo = entero(minimo);
  if (!Number.isInteger(stockMinimo) || stockMinimo < 0 || stockMinimo > LIMITE_UNIDADES) {
    errores.push('stockMinimo debe ser un entero mayor o igual a 0');
  }

  const datos = { codigo, nombre, precioUnitario, stockMinimo };

  if (esAlta) {
    const unidades = entero(body.unidades ?? 0);
    if (!Number.isInteger(unidades) || unidades < 0 || unidades > LIMITE_UNIDADES) {
      errores.push('unidades debe ser un entero mayor o igual a 0');
    }
    datos.unidades = unidades;
  }

  return { errores, datos };
}

// Ajuste de existencias: cantidad con signo (positiva suma, negativa resta), distinta de 0
export function validarAjuste(body = {}) {
  const errores = [];
  const cantidad = entero(body.cantidad);
  if (!Number.isInteger(cantidad) || cantidad === 0 || Math.abs(cantidad) > LIMITE_AJUSTE) {
    errores.push(`cantidad debe ser un entero distinto de 0, de hasta ${LIMITE_AJUSTE} unidades (positivo suma, negativo resta)`);
  }
  return { errores, datos: { cantidad } };
}

// Búsqueda y página del listado y del historial
export function validarConsulta(query = {}) {
  const errores = [];

  if (query.busqueda !== undefined && typeof query.busqueda !== 'string') errores.push('busqueda no es válida');
  const busqueda = texto(query.busqueda);
  if (busqueda.length > 60) errores.push('busqueda no puede pasar de 60 caracteres');

  let pagina = 1;
  if (query.pagina !== undefined) {
    pagina = typeof query.pagina === 'string' ? entero(query.pagina) : NaN;
    if (!Number.isInteger(pagina) || pagina < 1 || pagina > 100000) {
      errores.push('pagina debe ser un entero mayor o igual a 1');
    }
  }

  return { errores, datos: { busqueda, pagina } };
}