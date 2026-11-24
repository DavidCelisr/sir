import { prisma } from '../../lib/prisma.js';
import { ErrorNegocio } from '../../lib/errores.js';
import { normalizarDocumento } from '../../lib/documentos.js';
import { POR_PAGINA } from './clientes.validacion.js';

const MSG_NO_ENCONTRADO = 'Cliente no encontrado';
const MSG_DOCUMENTO_REPETIDO = 'Ya existe un cliente con ese documento en la empresa';

// Lo que se ve en los resultados de la búsqueda
const aResumen = (c) => ({
  id: c.id, nombre: c.nombre, tipoDocumento: c.tipoDocumento, numeroDocumento: c.numeroDocumento,
});

// Datos personales y de contacto de la ficha. Los historiales de casos y de cotizaciones
// se agregarán cuando existan esos módulos; el de cotizaciones solo para el Administrador y el Líder.
const aFicha = (c) => ({
  ...aResumen(c), correo: c.correo, telefono: c.telefono, ciudad: c.ciudad, direccion: c.direccion,
});

// Busca clientes de la empresa por nombre o por documento (los tres roles).
// empresaId viene del token.
export async function buscarClientes({ empresaId }, { busqueda, pagina }) {
  // El documento se busca normalizado: quien escribe "1.012.345" encuentra a "1012345678"
  const documento = normalizarDocumento(busqueda);
  const where = {
    empresaId,
    OR: [
      { nombre: { contains: busqueda, mode: 'insensitive' } },
      ...(documento ? [{ numeroDocumento: { contains: documento } }] : []),
    ],
  };

  const [total, clientes] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  return {
    clientes: clientes.map(aResumen),
    total, pagina, porPagina: POR_PAGINA, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
  };
}

// Ficha de un cliente. Si es de otra empresa responde "no encontrado" y no "prohibido",
// para no confirmar que existe.
export async function obtenerCliente({ empresaId }, id) {
  const cliente = await prisma.cliente.findFirst({ where: { id, empresaId } });
  if (!cliente) throw new ErrorNegocio(404, MSG_NO_ENCONTRADO);
  return aFicha(cliente);
}

// Recupera un cliente por tipo y número de documento, para no volver a escribir sus datos al crear una
// cotización o un caso. Un 404 aquí NO es un error: significa que es un cliente nuevo.
export async function buscarPorDocumento({ empresaId }, { tipoDocumento, numeroDocumento }) {
  const cliente = await prisma.cliente.findUnique({
    where: { empresaId_tipoDocumento_numeroDocumento: { empresaId, tipoDocumento, numeroDocumento } },
  });
  if (!cliente) throw new ErrorNegocio(404, 'No hay un cliente registrado con ese documento');
  return aFicha(cliente);
}

// Corrige los datos de un cliente (Administrador y Técnico Líder). Los cambios afectan solo a los
// datos ACTUALES del cliente: las cotizaciones guardan su propia copia y no se alteran.
// El documento también puede corregirse (errores de digitación), con la misma comprobación de unicidad.
export async function editarCliente({ empresaId }, id, datos) {
  // Mensaje claro si otro cliente de la empresa ya tiene ese documento
  const repetido = await prisma.cliente.findFirst({
    where: { empresaId, tipoDocumento: datos.tipoDocumento, numeroDocumento: datos.numeroDocumento, id: { not: id } },
    select: { id: true },
  });
  if (repetido) throw new ErrorNegocio(409, MSG_DOCUMENTO_REPETIDO);

  try {
    // La condición incluye empresaId: no se puede editar el cliente de otra empresa
    const resultado = await prisma.cliente.updateMany({ where: { id, empresaId }, data: datos });
    if (resultado.count === 0) throw new ErrorNegocio(404, MSG_NO_ENCONTRADO);
  } catch (error) {
    // Dos ediciones simultáneas con el mismo documento: el índice único de PostgreSQL decide cuál gana
    if (error.code === 'P2002') throw new ErrorNegocio(409, MSG_DOCUMENTO_REPETIDO);
    throw error;
  }

  return aFicha(await prisma.cliente.findFirst({ where: { id, empresaId } }));
}