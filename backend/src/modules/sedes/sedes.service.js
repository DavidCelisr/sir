import { prisma } from '../../lib/prisma.js';
import { ErrorNegocio } from '../../lib/errores.js';
import { LIMITE_SEDES } from './sedes.validacion.js';

const MSG_NO_ENCONTRADA = 'Sede no encontrada';
const MSG_NOMBRE_REPETIDO = 'Ya existe una sede activa con ese nombre';
const MSG_LIMITE = `Una empresa admite hasta ${LIMITE_SEDES} sedes activas`;
const MSG_PRINCIPAL_PROTEGIDA = 'La sede principal no se puede eliminar. Designe otra sede como principal primero';
const MSG_YA_ES_PRINCIPAL = 'Esa sede ya es la principal';
const MSG_CAMBIO_SIMULTANEO = 'La sede principal cambió mientras se hacía la operación. Recargue e intente de nuevo';

// Lo que se devuelve de una sede. Nunca empresaId ni activo.
const aSede = (s) => ({
  id: s.id, nombre: s.nombre, direccion: s.direccion,
  departamento: s.departamento, ciudad: s.ciudad, esPrincipal: s.esPrincipal,
});

// Las sedes activas de la empresa (pocas: máximo LIMITE_SEDES). Sirven para revisar el nombre y el límite.
const activasDe = (cliente, empresaId) =>
  cliente.sede.findMany({ where: { empresaId, activo: true }, select: { id: true, nombre: true } });

// ¿Hay otra sede activa con ese nombre? Sin distinguir mayúsculas. 'excluirId' sirve al editar.
// Se compara aquí y no en la consulta para evitar los comodines de las búsquedas por patrón ("Sede_01").
const nombreRepetido = (activas, nombre, excluirId) =>
  activas.some((s) => s.id !== excluirId && s.nombre.toLowerCase() === nombre.toLowerCase());

// PROVISIONAL: el módulo de Casos todavía no existe, así que no hay casos que contar.
// Cuando exista, debe contar los casos abiertos (ni Cerrado ni Cancelado) de la sede. Recibe el cliente
// de la transacción (tx) para que la comprobación y la inactivación ocurran juntas.
// eslint-disable-next-line no-unused-vars
async function contarCasosAbiertos(tx, sedeId, empresaId) {
  return 0;
}

// ---------- Consulta ----------

// Lista las sedes ACTIVAS de la empresa, con la principal primero. La leen el Administrador (para
// gestionarlas) y el Técnico Líder (para elegir la sede al cotizar). empresaId viene del token.
export async function listarSedes({ empresaId }) {
  const sedes = await prisma.sede.findMany({
    where: { empresaId, activo: true },
    orderBy: [{ esPrincipal: 'desc' }, { nombre: 'asc' }, { id: 'asc' }],
  });
  return { sedes: sedes.map(aSede) };
}

// ---------- Gestión (solo el Administrador) ----------

// Crea una sede. Nunca nace como principal: la principal solo se cambia con «Designar como principal».
export async function crearSede({ empresaId }, datos) {
  const activas = await activasDe(prisma, empresaId);
  if (activas.length >= LIMITE_SEDES) throw new ErrorNegocio(409, MSG_LIMITE);
  if (nombreRepetido(activas, datos.nombre)) throw new ErrorNegocio(409, MSG_NOMBRE_REPETIDO);

  try {
    return aSede(await prisma.sede.create({ data: { empresaId, ...datos } }));
  } catch (error) {
    // Dos altas simultáneas con el mismo nombre: el índice único de PostgreSQL decide cuál gana
    if (error.code === 'P2002') throw new ErrorNegocio(409, MSG_NOMBRE_REPETIDO);
    throw error;
  }
}

// Edita nombre, dirección, departamento y ciudad. También sirve para renombrar la sede principal.
// No cambia ni esPrincipal ni activo.
export async function editarSede({ empresaId }, id, datos) {
  const activas = await activasDe(prisma, empresaId);
  if (!activas.some((s) => s.id === id)) throw new ErrorNegocio(404, MSG_NO_ENCONTRADA);
  if (nombreRepetido(activas, datos.nombre, id)) throw new ErrorNegocio(409, MSG_NOMBRE_REPETIDO);

  try {
    // La condición incluye empresaId y activo: no se edita la sede de otra empresa ni una eliminada
    const resultado = await prisma.sede.updateMany({ where: { id, empresaId, activo: true }, data: datos });
    if (resultado.count === 0) throw new ErrorNegocio(404, MSG_NO_ENCONTRADA);
  } catch (error) {
    if (error.code === 'P2002') throw new ErrorNegocio(409, MSG_NOMBRE_REPETIDO);
    throw error;
  }
  return aSede(await prisma.sede.findFirst({ where: { id, empresaId } }));
}

// «Designar como principal»: intercambio en UNA transacción. La principal actual pasa a ser una sede normal
// (sigue activa) y la elegida pasa a ser la principal. Si algo falla en medio, se revierte todo y la empresa
// nunca se queda sin principal.
export async function designarPrincipal({ empresaId }, id) {
  try {
    return await prisma.$transaction(async (tx) => {
      const sede = await tx.sede.findFirst({ where: { id, empresaId, activo: true } });
      if (!sede) throw new ErrorNegocio(404, MSG_NO_ENCONTRADA);
      if (sede.esPrincipal) throw new ErrorNegocio(409, MSG_YA_ES_PRINCIPAL);

      // 1. La principal actual deja de serlo. 2. La elegida pasa a serlo.
      await tx.sede.updateMany({ where: { empresaId, esPrincipal: true }, data: { esPrincipal: false } });
      const resultado = await tx.sede.updateMany({ where: { id, empresaId, activo: true }, data: { esPrincipal: true } });
      if (resultado.count === 0) throw new ErrorNegocio(404, MSG_NO_ENCONTRADA);

      return aSede(await tx.sede.findFirst({ where: { id, empresaId } }));
    });
  } catch (error) {
    // Dos designaciones simultáneas: el índice único de PostgreSQL dejó pasar solo a una
    if (error.code === 'P2002') throw new ErrorNegocio(409, MSG_CAMBIO_SIMULTANEO);
    throw error;
  }
}

// "Eliminar" = inactivación lógica: la sede se conserva (las cotizaciones y los casos la referencian) y su
// nombre queda libre. La principal no se puede eliminar (el CHECK de PostgreSQL también lo impide).
export async function eliminarSede({ empresaId }, id) {
  await prisma.$transaction(async (tx) => {
    const abiertos = await contarCasosAbiertos(tx, id, empresaId);
    if (abiertos > 0) {
      throw new ErrorNegocio(
        409,
        `No es posible eliminar esta sede mientras tenga casos abiertos (${abiertos}). Ciérrelos o cancélelos antes`,
      );
    }

    // La condición repite empresaId, activo y "no principal" (misma razón que en las demás escrituras)
    const resultado = await tx.sede.updateMany({
      where: { id, empresaId, activo: true, esPrincipal: false },
      data: { activo: false },
    });
    if (resultado.count === 0) {
      // O no existe (404), o es la principal (409)
      const sede = await tx.sede.findFirst({ where: { id, empresaId, activo: true }, select: { id: true } });
      throw sede ? new ErrorNegocio(409, MSG_PRINCIPAL_PROTEGIDA) : new ErrorNegocio(404, MSG_NO_ENCONTRADA);
    }
  });
}