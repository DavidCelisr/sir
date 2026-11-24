import prismaClient from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ErrorNegocio } from '../../lib/errores.js';
import { enviarCorreo } from '../../lib/correo.js';
import { normalizarDocumento } from '../../lib/documentos.js';
import { POR_PAGINA } from './cotizaciones.validacion.js';
import { TEXTO_LEGAL, NOTA_IVA, codigoCotizacion, textoDelCorreo } from './cotizaciones.texto.js';

const { Prisma } = prismaClient;
const MSG_NO_ENCONTRADA = 'Cotización no encontrada';
const INCLUIR_LINEAS = { lineas: { orderBy: { orden: 'asc' } } };

// Lo que se ve en el listado
const aResumen = (c) => ({
  id: c.id,
  numero: c.numero,
  codigo: codigoCotizacion(c.numero),
  fecha: c.creadaEn,
  cliente: c.clienteNombre,
  documento: c.clienteNumeroDocumento,
  total: c.total.toString(), // los importes viajan como TEXTO para no perder exactitud
  creadaPor: c.creadaPorNombre,
});

// Detalle completo: es lo que se imprime y lo que se envía por correo. Incluye los textos fijos.
const aDetalle = (c) => ({
  id: c.id,
  numero: c.numero,
  codigo: codigoCotizacion(c.numero),
  fecha: c.creadaEn,
  creadaPor: c.creadaPorNombre,
  // Copia del cliente al momento de crear la cotización (no cambia si luego se corrige al cliente)
  cliente: {
    tipoDocumento: c.clienteTipoDocumento,
    numeroDocumento: c.clienteNumeroDocumento,
    nombre: c.clienteNombre,
    correo: c.clienteCorreo,
    telefono: c.clienteTelefono,
    ciudad: c.clienteCiudad, // ciudad de residencia
    direccion: c.clienteDireccion,
  },
  ciudadServicio: c.ciudadServicio,
  diagnostico: c.diagnostico,
  lineas: c.lineas.map((l) => ({
    id: l.id,
    tipo: l.tipo,
    codigo: l.codigo,
    descripcion: l.descripcion,
    cantidad: l.cantidad,
    precioUnitario: l.precioUnitario.toString(),
    subtotal: l.subtotal.toString(),
  })),
  total: c.total.toString(),
  notaIva: NOTA_IVA,
  textoLegal: TEXTO_LEGAL,
});

// Busca la cotización por id Y empresaId. Si es de otra empresa responde "no encontrada" y
// no "prohibido", para no confirmar que existe.
async function buscar(empresaId, id) {
  const cotizacion = await prisma.cotizacion.findFirst({ where: { id, empresaId }, include: INCLUIR_LINEAS });
  if (!cotizacion) throw new ErrorNegocio(404, MSG_NO_ENCONTRADA);
  return cotizacion;
}

// Siguiente número de cotización de la empresa. Se llama DENTRO de la transacción:
// el UPDATE deja la fila del contador bloqueada hasta confirmar. Dos cotizaciones simultáneas quedan
// en fila y nunca repiten número; si la creación falla, el incremento se revierte y no queda un hueco.
async function siguienteNumero(tx, empresaId) {
  // 1. La fila del contador existe (la primera vez se crea; si otra transacción la crea a la vez, no pasa nada)
  await tx.contadorCotizacion.createMany({ data: [{ empresaId }], skipDuplicates: true });
  // 2. Se incrementa. Desde aquí la fila está bloqueada por esta transacción
  await tx.contadorCotizacion.updateMany({ where: { empresaId }, data: { ultimo: { increment: 1 } } });
  // 3. Se lee: como la fila sigue bloqueada, el valor es el nuestro
  const fila = await tx.contadorCotizacion.findUnique({ where: { empresaId } });
  return fila.ultimo;
}

// ---------- Consulta ----------

// Lista las cotizaciones de la empresa (las más recientes primero), con búsqueda por número, nombre o
// documento del cliente. El Administrador y el Técnico Líder ven TODAS las de la empresa.
export async function listarCotizaciones({ empresaId }, { busqueda, pagina }) {
  const documento = normalizarDocumento(busqueda); // "1.012.345" encuentra "1012345678"
  // "COT-000123", "cot123", "123" y "000123" son el mismo número
  const coincidencia = /^(?:COT-?)?0*(\d{1,9})$/i.exec(busqueda);
  const numero = coincidencia ? Number(coincidencia[1]) : null;

  const where = {
    empresaId,
    // La búsqueda solo se agrega si llegó: con "undefined" Prisma ignoraría la condición
    ...(busqueda
      ? {
          OR: [
            { clienteNombre: { contains: busqueda, mode: 'insensitive' } },
            ...(documento ? [{ clienteNumeroDocumento: { contains: documento } }] : []),
            ...(numero ? [{ numero }] : []),
          ],
        }
      : {}),
  };

  const [total, cotizaciones] = await Promise.all([
    prisma.cotizacion.count({ where }),
    prisma.cotizacion.findMany({
      where,
      orderBy: [{ creadaEn: 'desc' }, { id: 'desc' }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  return {
    cotizaciones: cotizaciones.map(aResumen),
    total, pagina, porPagina: POR_PAGINA, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
  };
}

export async function obtenerCotizacion({ empresaId }, id) {
  return aDetalle(await buscar(empresaId, id));
}

// Piezas del inventario activo para armar una cotización, CON precio (el listado del inventario no lo
// trae). No se muestran ni se validan existencias: el descuento ocurre al cerrar un caso.
export async function listarPiezasParaCotizar({ empresaId }, { busqueda }) {
  const where = {
    empresaId,
    activo: true,
    ...(busqueda
      ? {
          OR: [
            { nombre: { contains: busqueda, mode: 'insensitive' } },
            { codigo: { contains: busqueda, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [total, piezas] = await Promise.all([
    prisma.pieza.count({ where }),
    prisma.pieza.findMany({ where, orderBy: [{ nombre: 'asc' }, { id: 'asc' }], take: POR_PAGINA }),
  ]);
  return {
    piezas: piezas.map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, precioUnitario: p.precioUnitario.toString() })),
    total,
  };
}

// ---------- Crear ----------

// Crea la cotización. Todo ocurre en UNA transacción: si algo falla, no se crea el
// cliente, no se consume el número y no queda nada a medias. empresaId y usuarioId vienen del token.
export async function crearCotizacion({ empresaId, usuarioId }, { cliente: datosCliente, ciudadServicio, diagnostico, lineas }) {
  const { cotizacion, clienteNuevo } = await prisma.$transaction(async (tx) => {
    // 1. Piezas del inventario activo de ESTA empresa
    const idsPiezas = [...new Set(lineas.filter((l) => l.tipo === 'PIEZA').map((l) => l.piezaId))];
    const piezas = idsPiezas.length > 0
      ? await tx.pieza.findMany({ where: { id: { in: idsPiezas }, empresaId, activo: true } })
      : [];
    const piezaPorId = new Map(piezas.map((p) => [p.id, p]));

    // 2. Las líneas, con el precio y el nombre COPIADOS ahora, y el total con precisión exacta
    let total = new Prisma.Decimal(0);
    const lineasCopiadas = lineas.map((l, i) => {
      let codigo = null;
      let descripcion;
      let cantidad;
      let precio;

      if (l.tipo === 'PIEZA') {
        const pieza = piezaPorId.get(l.piezaId);
        if (!pieza) {
          throw new ErrorNegocio(409, `Línea ${i + 1}: la pieza ya no está disponible (no existe o fue eliminada). Revise la cotización`);
        }
        // Quien cotiza vio un precio: si el inventario lo cambió mientras armaba la cotización, se pide revisar
        if (!pieza.precioUnitario.equals(new Prisma.Decimal(l.precioUnitario))) {
          throw new ErrorNegocio(409, `El precio de «${pieza.nombre}» cambió mientras armaba la cotización. Revise la cotización`);
        }
        codigo = pieza.codigo;
        descripcion = pieza.nombre;
        cantidad = l.cantidad;
        precio = pieza.precioUnitario;
      } else {
        descripcion = l.descripcion;
        cantidad = 1; // un servicio es una sola unidad
        precio = new Prisma.Decimal(l.valor);
      }

      const subtotal = precio.times(cantidad);
      total = total.plus(subtotal);
      return {
        orden: i + 1, tipo: l.tipo, piezaId: l.tipo === 'PIEZA' ? l.piezaId : null,
        codigo, descripcion, cantidad, precioUnitario: precio, subtotal,
      };
    });

    // 3. El cliente: se obtiene o se crea. Si ya existe, se usan SUS datos almacenados y se
    //    ignoran los del cuerpo (decisión 5, opción B): las correcciones se hacen desde el detalle de un caso.
    const clave = {
      empresaId_tipoDocumento_numeroDocumento: {
        empresaId, tipoDocumento: datosCliente.tipoDocumento, numeroDocumento: datosCliente.numeroDocumento,
      },
    };
    let cliente = await tx.cliente.findUnique({ where: clave });
    let nuevo = false;
    if (!cliente) {
      if (!datosCliente.nombre) throw new ErrorNegocio(400, 'cliente.nombre es obligatorio para un cliente nuevo');
      // createMany + skipDuplicates (ON CONFLICT DO NOTHING): si otra cotización registró al mismo cliente
      // un instante antes, no falla ni anula la transacción: simplemente se reutiliza
      const { count } = await tx.cliente.createMany({ data: [{ empresaId, ...datosCliente }], skipDuplicates: true });
      nuevo = count === 1;
      cliente = await tx.cliente.findUnique({ where: clave });
    }

    // 4. El número, lo más tarde posible: la fila del contador queda bloqueada hasta confirmar la transacción
    const numero = await siguienteNumero(tx, empresaId);

    // 5. Quién la crea, con su nombre de ESTE momento
    const usuario = await tx.usuario.findFirst({ where: { id: usuarioId, empresaId }, select: { nombre: true } });

    const creada = await tx.cotizacion.create({
      data: {
        empresaId, numero,
        clienteId: cliente.id,
        // Copia histórica: sale de la fila del cliente, nunca del cuerpo de la petición
        clienteTipoDocumento: cliente.tipoDocumento,
        clienteNumeroDocumento: cliente.numeroDocumento,
        clienteNombre: cliente.nombre,
        clienteCorreo: cliente.correo,
        clienteTelefono: cliente.telefono,
        clienteCiudad: cliente.ciudad,
        clienteDireccion: cliente.direccion,
        ciudadServicio, diagnostico, total,
        creadaPorId: usuarioId,
        creadaPorNombre: usuario?.nombre ?? 'Usuario desconocido',
        lineas: { create: lineasCopiadas },
      },
      include: INCLUIR_LINEAS,
    });
    return { cotizacion: creada, clienteNuevo: nuevo };
  });

  return { ...aDetalle(cotizacion), clienteNuevo };
}

// ---------- Enviar ----------

// Envía la cotización por correo (simulado en la consola, como los demás correos). Se puede hacer en
// cualquier momento y NO deja registro: la cotización no tiene estados.
//  - CLIENTE: al correo del cliente guardado en la cotización.
//  - MI_CORREO: al correo del usuario que realiza la acción (no al del representante legal). Sirve
//    cuando el cliente no tiene correo: la empresa reenvía el PDF.
export async function enviarCotizacion({ empresaId, usuarioId }, id, { destino }) {
  const cotizacion = await buscar(empresaId, id);

  let para;
  if (destino === 'CLIENTE') {
    para = cotizacion.clienteCorreo;
    if (!para) {
      throw new ErrorNegocio(409, 'El cliente no tiene correo registrado. Use «Enviar a mi correo» o imprima la cotización');
    }
  } else {
    const usuario = await prisma.usuario.findFirst({ where: { id: usuarioId, empresaId }, select: { correo: true } });
    para = usuario?.correo;
    if (!para) throw new ErrorNegocio(409, 'Su usuario no tiene un correo registrado');
  }

  // Nombre de la empresa para el encabezado del correo (misma regla que la sesión)
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { tipoAfiliacion: true, razonSocial: true, responsable: { select: { nombres: true, apellidos: true } } },
  });
  const nombreEmpresa =
    empresa.tipoAfiliacion === 'PERSONA_JURIDICA'
      ? empresa.razonSocial
      : `${empresa.responsable?.nombres ?? ''} ${empresa.responsable?.apellidos ?? ''}`.trim();

  const detalle = aDetalle(cotizacion);
  try {
    await enviarCorreo({
      para,
      asunto: destino === 'CLIENTE'
        ? `Cotización ${detalle.codigo}`
        : `Cotización ${detalle.codigo} (para reenviar al cliente)`,
      texto: textoDelCorreo(detalle, nombreEmpresa || 'SIR'),
    });
  } catch (error) {
    // Aquí enviar ES el propósito de la acción: si falla, se informa (no se silencia)
    console.error('No se pudo enviar la cotización:', error.message);
    throw new ErrorNegocio(502, 'No se pudo enviar el correo. Intente de nuevo');
  }

  return { mensaje: 'Cotización enviada', destino: para };
}