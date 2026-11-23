import { prisma } from '../../lib/prisma.js';
import { ErrorNegocio } from '../../lib/errores.js';
import { LIMITE_UNIDADES, POR_PAGINA } from './inventario.validacion.js';

const MSG_NO_ENCONTRADA = 'Pieza no encontrada';
const MSG_CODIGO_REPETIDO = 'Ya existe una pieza activa con ese código';

// Lo que se ve en el listado: código, nombre y unidades. 'bajoMinimo' es solo un indicador.
const aResumen = (p) => ({
  id: p.id, codigo: p.codigo, nombre: p.nombre, unidades: p.unidades,
  bajoMinimo: p.unidades <= p.stockMinimo,
});

// Lo que se ve en "Detalles". El precio viaja como TEXTO para no perder exactitud.
const aDetalle = (p) => ({
  ...aResumen(p),
  stockMinimo: p.stockMinimo,
  precioUnitario: p.precioUnitario.toString(),
  creadaEn: p.creadaEn,
});

const paginacion = (total, pagina) => ({
  total, pagina, porPagina: POR_PAGINA, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
});

// Busca la pieza ACTIVA por id Y empresaId. Si es de otra empresa o ya está eliminada,
// responde "no encontrada" y no "prohibido", para no confirmar que existe.
// 'cliente' es prisma o el cliente de una transacción (tx).
async function buscarActiva(cliente, empresaId, id) {
  const pieza = await cliente.pieza.findFirst({ where: { id, empresaId, activo: true } });
  if (!pieza) throw new ErrorNegocio(404, MSG_NO_ENCONTRADA);
  return pieza;
}

// Anota un movimiento en el historial de la pieza. El nombre de quien actuó se guarda como TEXTO,
// tal como es en este momento: cambiará si la persona actualiza sus datos.
async function registrarMovimiento(tx, { empresaId, usuarioId, ...datos }) {
  const usuario = await tx.usuario.findFirst({ where: { id: usuarioId, empresaId }, select: { nombre: true } });
  await tx.movimientoPieza.create({
    data: { empresaId, usuarioId, usuarioNombre: usuario?.nombre ?? 'Usuario desconocido', ...datos },
  });
}

// ¿Hay otra pieza ACTIVA con ese código? Sin distinguir mayúsculas. 'excluirId' sirve al editar.
const codigoEnUso = (empresaId, codigo, excluirId) =>
  prisma.pieza.findFirst({
    where: {
      empresaId, activo: true,
      codigo: { equals: codigo, mode: 'insensitive' },
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
    select: { id: true },
  });

// ---------- Listado y consulta ----------

// Lista las piezas activas de la empresa, con búsqueda por nombre o código y paginación
export async function listarPiezas({ empresaId }, { busqueda, pagina }) {
  const where = {
    empresaId,
    activo: true,
    // La búsqueda solo se agrega si llegó: con "undefined" Prisma ignoraría la condición
    ...(busqueda
      ? { OR: [
          { nombre: { contains: busqueda, mode: 'insensitive' } },
          { codigo: { contains: busqueda, mode: 'insensitive' } },
        ] }
      : {}),
  };

  const [total, piezas] = await Promise.all([
    prisma.pieza.count({ where }),
    prisma.pieza.findMany({
      where,
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);
  return { piezas: piezas.map(aResumen), ...paginacion(total, pagina) };
}

// Detalles de una pieza: unidades, mínimo y precio unitario
export async function obtenerPieza({ empresaId }, id) {
  return aDetalle(await buscarActiva(prisma, empresaId, id));
}

// Historial propio de la pieza: lo más reciente primero
export async function listarHistorial({ empresaId }, id, { pagina }) {
  await buscarActiva(prisma, empresaId, id);

  const where = { piezaId: id, empresaId };
  const [total, movimientos] = await Promise.all([
    prisma.movimientoPieza.count({ where }),
    prisma.movimientoPieza.findMany({
      where,
      orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  return {
    movimientos: movimientos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      cantidad: m.cantidad,
      unidadesAntes: m.unidadesAntes,
      unidadesDespues: m.unidadesDespues,
      precioAntes: m.precioAntes?.toString() ?? null,
      precioDespues: m.precioDespues?.toString() ?? null,
      usuario: m.usuarioNombre, // el nombre de entonces, no el actual
      fecha: m.creadoEn,
    })),
    ...paginacion(total, pagina),
  };
}

// ---------- Gestión ----------

// Crea una pieza y anota su alta en el historial, en una sola transacción
export async function crearPieza({ empresaId, usuarioId }, datos) {
  if (datos.codigo && (await codigoEnUso(empresaId, datos.codigo))) {
    throw new ErrorNegocio(409, MSG_CODIGO_REPETIDO);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const pieza = await tx.pieza.create({ data: { empresaId, ...datos } });
      await registrarMovimiento(tx, {
        empresaId, usuarioId, piezaId: pieza.id, tipo: 'ALTA',
        cantidad: pieza.unidades, unidadesAntes: 0, unidadesDespues: pieza.unidades,
        precioDespues: pieza.precioUnitario,
      });
      return aDetalle(pieza);
    });
  } catch (error) {
    // Dos altas simultáneas con el mismo código: el índice único de PostgreSQL decide cuál gana
    if (error.code === 'P2002') throw new ErrorNegocio(409, MSG_CODIGO_REPETIDO);
    throw error;
  }
}

// Edita código, nombre, precio y mínimo. NO toca las existencias (solo cambian con un ajuste).
export async function editarPieza({ empresaId, usuarioId }, id, datos) {
  if (datos.codigo && (await codigoEnUso(empresaId, datos.codigo, id))) {
    throw new ErrorNegocio(409, MSG_CODIGO_REPETIDO);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const actual = await buscarActiva(tx, empresaId, id);
      const cambioPrecio = !actual.precioUnitario.equals(datos.precioUnitario);

      // Control optimista: el UPDATE solo se aplica si el precio sigue siendo el que se leyó.
      // Si otra persona lo cambió en medio, no encuentra la fila (count 0) y se pide recargar.
      const resultado = await tx.pieza.updateMany({
        where: { id, empresaId, activo: true, precioUnitario: actual.precioUnitario },
        data: datos,
      });
      if (resultado.count === 0) {
        throw new ErrorNegocio(409, 'La pieza fue modificada por otra persona. Recargue e intente de nuevo');
      }

      if (cambioPrecio) {
        await registrarMovimiento(tx, {
          empresaId, usuarioId, piezaId: id, tipo: 'CAMBIO_PRECIO',
          precioAntes: actual.precioUnitario, precioDespues: datos.precioUnitario,
        });
      }
      return aDetalle(await tx.pieza.findFirst({ where: { id, empresaId } }));
    });
  } catch (error) {
    if (error.code === 'P2002') throw new ErrorNegocio(409, MSG_CODIGO_REPETIDO);
    throw error;
  }
}

// Suma o resta existencias de forma ATÓMICA. La comprobación y la suma ocurren juntas en
// un solo UPDATE de la base de datos: dos ajustes simultáneos nunca dejan el stock en negativo ni
// se pisan entre sí. El historial se escribe en la misma transacción.
export async function ajustarExistencias({ empresaId, usuarioId }, id, { cantidad }) {
  return prisma.$transaction(async (tx) => {
    const resultado = await tx.pieza.updateMany({
      where: {
        id, empresaId, activo: true,
        // Al restar, deben quedar al menos 'cantidad' unidades; al sumar, no pasar del tope
        unidades: {
          gte: cantidad < 0 ? -cantidad : 0,
          lte: cantidad > 0 ? LIMITE_UNIDADES - cantidad : LIMITE_UNIDADES,
        },
      },
      data: { unidades: { increment: cantidad } },
    });

    if (resultado.count === 0) {
      // O la pieza no existe (404), o la condición no se cumplió
      const pieza = await buscarActiva(tx, empresaId, id);
      if (cantidad < 0) {
        throw new ErrorNegocio(
          409,
          `No hay existencias suficientes: hay ${pieza.unidades} unidad(es) y se intenta restar ${-cantidad}`,
        );
      }
      throw new ErrorNegocio(409, 'El ajuste supera el máximo de unidades permitido');
    }

    // Esta lectura ve el valor ya actualizado, y la fila sigue bloqueada hasta confirmar:
    // por eso "antes" y "después" son exactos aunque haya otras personas ajustando
    const pieza = await tx.pieza.findFirst({ where: { id, empresaId } });
    await registrarMovimiento(tx, {
      empresaId, usuarioId, piezaId: id, tipo: 'AJUSTE',
      cantidad, unidadesAntes: pieza.unidades - cantidad, unidadesDespues: pieza.unidades,
    });
    return aDetalle(pieza);
  });
}

// "Eliminar" = inactivación lógica: la pieza y su historial se conservan (cotizaciones y facturas
// antiguas siguen refiriéndose a ella). Su código queda libre. No hay reactivación.
export async function eliminarPieza({ empresaId }, id) {
  const resultado = await prisma.pieza.updateMany({
    where: { id, empresaId, activo: true },
    data: { activo: false },
  });
  if (resultado.count === 0) throw new ErrorNegocio(404, MSG_NO_ENCONTRADA);
}