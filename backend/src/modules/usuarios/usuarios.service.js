import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { ErrorNegocio } from '../../lib/errores.js';
import { nombreCompleto } from '../../lib/nombres.js';

// roles puede crear cada rol. El Administrador solo nace en el registro autogestionado.
const ROLES_CREABLES = {
  ADMINISTRADOR: ['TECNICO_LIDER', 'TECNICO'],
  TECNICO_LIDER: ['TECNICO'],
};

const MSG_YA_TIENE_LIDER = 'La empresa ya tiene un Técnico Líder'; // mensaje provisional.
const MSG_USUARIO_EN_USO = 'Ese nombre de usuario ya está en uso';
const MSG_DOCUMENTO_REPETIDO = 'Ya existe un usuario con ese documento en la empresa';
const MSG_ADMIN_PROTEGIDO = 'El usuario administrador no se puede eliminar';

// Campos que se devuelven. Nunca el hash de la contraseña ni la empresa.
const SELECCION = {
  id: true, nombres: true, apellidos: true, nombre: true, nombreUsuario: true, rol: true,
  correo: true, tipoDocumento: true, numeroDocumento: true, creadoEn: true,
};

// soloLectura le indica al frontend que no debe ofrecer eliminar al Administrador
const conSoloLectura = (u) => ({ ...u, soloLectura: u.rol === 'ADMINISTRADOR' });

// ¿Hay un Técnico Líder ACTIVO en la empresa? uno solo; uno eliminado no cuenta
const hayLiderActivo = (empresaId) =>
  prisma.usuario.findFirst({ where: { empresaId, rol: 'TECNICO_LIDER', activo: true }, select: { id: true } });

// ---------- Alta de subperfiles ----------

// empresaId y rolCreador vienen del token (req.auth), NUNCA del cuerpo
export async function crearSubperfil(
  { empresaId, rolCreador },
  { rol, nombres, apellidos, tipoDocumento, numeroDocumento, correo, nombreUsuario, password },
) {
  // 1. ¿Este rol puede crear ese tipo de usuario? (se valida aquí aunque se llame a la API directamente)
  if (!(ROLES_CREABLES[rolCreador] ?? []).includes(rol)) {
    throw new ErrorNegocio(403, 'No tiene permiso para crear ese tipo de usuario');
  }

  // 2. un solo Técnico Líder ACTIVO por empresa
  if (rol === 'TECNICO_LIDER' && (await hayLiderActivo(empresaId))) {
    throw new ErrorNegocio(409, MSG_YA_TIENE_LIDER);
  }

  // 3. el nombre de usuario es único en todo el sistema, y el de un usuario eliminado sigue ocupado
  const enUso = await prisma.usuario.findUnique({ where: { nombreUsuario }, select: { id: true } });
  if (enUso) throw new ErrorNegocio(409, MSG_USUARIO_EN_USO);

  // 4. el documento es único por empresa entre usuarios activos
  const documentoRepetido = await prisma.usuario.findFirst({
    where: { empresaId, tipoDocumento, numeroDocumento, activo: true },
    select: { id: true },
  });
  if (documentoRepetido) throw new ErrorNegocio(409, MSG_DOCUMENTO_REPETIDO);

  // 5. Nunca se guarda la contraseña, solo su hash
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    return await prisma.usuario.create({
      data: {
        empresaId, rol, nombres, apellidos,
        nombre: nombreCompleto(nombres, apellidos), // nombre completo, generado
        tipoDocumento, numeroDocumento, correo, nombreUsuario, passwordHash,
      },
      select: SELECCION, // no se devuelve el hash
    });
  } catch (error) {
    // Si dos peticiones ocurren al mismo tiempo, la base de datos evita los duplicados
    // Después se consulta nuevamente para identificar el conflicto.
    if (error.code === 'P2002') {
      const nombreOcupado = await prisma.usuario.findUnique({ where: { nombreUsuario }, select: { id: true } });
      if (nombreOcupado) throw new ErrorNegocio(409, MSG_USUARIO_EN_USO);
      if (rol === 'TECNICO_LIDER' && (await hayLiderActivo(empresaId))) {
        throw new ErrorNegocio(409, MSG_YA_TIENE_LIDER);
      }
      throw new ErrorNegocio(409, MSG_DOCUMENTO_REPETIDO);
    }
    throw error;
  }
}

// ---------- Cambio de contraseña ----------

// cambia la contraseña de quien está autenticado.
// id y empresaId vienen del token, nunca del cuerpo.
export async function cambiarPassword({ id, empresaId }, { passwordActual, passwordNueva }) {
  // Se busca por id Y empresaId
  const usuario = await prisma.usuario.findFirst({
    where: { id, empresaId },
    select: { id: true, passwordHash: true },
  });
  if (!usuario) throw new ErrorNegocio(404, 'Usuario no encontrado');

  // exigir la clave actual
  const claveCorrecta = await bcrypt.compare(passwordActual, usuario.passwordHash);
  if (!claveCorrecta) throw new ErrorNegocio(400, 'La contraseña actual es incorrecta');

  // Nunca se guarda la contraseña, solo su hash
  const passwordHash = await bcrypt.hash(passwordNueva, 12);
  await prisma.usuario.update({ where: { id: usuario.id }, data: { passwordHash } });
}

// ---------- Gestión de usuarios ----------

// Lista los usuarios ACTIVOS de la empresa. empresaId y rolSolicitante vienen del token.
//  - Administrador: ve a todos y puede filtrar por rol.
//  - Técnico Líder: ve SOLO a los Técnicos. El filtro se aplica aquí, en el servidor: el parámetro
//    ?rol= se ignora para él, así que no puede pedir otros roles.
export async function listarUsuarios({ empresaId, rolSolicitante }, { rol }) {
  const filtroRol = rolSolicitante === 'TECNICO_LIDER' ? 'TECNICO' : rol;

  const usuarios = await prisma.usuario.findMany({
    // El rol solo se agrega al filtro si existe: con "rol: undefined" Prisma ignoraría la condición.
    // Los usuarios eliminados (activo = false) no aparecen.
    where: { empresaId, activo: true, ...(filtroRol ? { rol: filtroRol } : {}) },
    // Los enums se ordenan como se declararon: ADMINISTRADOR, TECNICO_LIDER, TECNICO
    orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
    select: SELECCION,
  });
  return usuarios.map(conSoloLectura);
}

// Busca al usuario por id Y empresaId. Si es de otra empresa, o ya está eliminado, responde
// "no encontrado" y no "prohibido", para no confirmar que existe. El Administrador no se elimina.
async function buscarGestionable(empresaId, id) {
  const usuario = await prisma.usuario.findFirst({
    where: { id, empresaId, activo: true },
    select: { id: true, rol: true },
  });
  if (!usuario) throw new ErrorNegocio(404, 'Usuario no encontrado');
  if (usuario.rol === 'ADMINISTRADOR') throw new ErrorNegocio(403, MSG_ADMIN_PROTEGIDO);
  return usuario;
}

// PROVISIONAL: el módulo de Casos todavía no existe, así que no hay casos que contar.
// Cuando exista, debe contar los casos del usuario cuyo estado NO sea Cerrado ni Cancelado
// (un caso "abierto" es cualquier otro). Recibe el cliente de la transacción (tx) para que
// la comprobación y la inactivación ocurran juntas y nadie pueda asignarle un caso en medio.
// eslint-disable-next-line no-unused-vars
async function contarCasosAbiertos(tx, usuarioId, empresaId) {
  return 0;
}

// "Eliminar" = inactivación lógica: la fila y su historial se conservan, con activo = false.
// Se permite si el usuario no tiene casos abiertos asignados. No hay reasignación automática:
// si los tiene, se reasignan a mano, solo el administrador.
export async function eliminarUsuario({ empresaId }, id) {
  await buscarGestionable(empresaId, id);

  await prisma.$transaction(async (tx) => {
    const abiertos = await contarCasosAbiertos(tx, id, empresaId);
    if (abiertos > 0) {
      throw new ErrorNegocio(
        409,
        `No es posible eliminar a este usuario mientras tenga casos abiertos asignados (${abiertos}). Reasígnelos antes de eliminarlo`,
      );
    }

    // Los códigos de recuperación pendientes dejan de servir
    await tx.codigoRecuperacion.updateMany({
      where: { usuarioId: id, empresaId, usadoEn: null },
      data: { usadoEn: new Date() },
    });

    // La condición repite empresaId, activo y "no administrador" (misma razón que en buscarGestionable)
    const inactivados = await tx.usuario.updateMany({
      where: { id, empresaId, activo: true, rol: { not: 'ADMINISTRADOR' } },
      data: { activo: false },
    });
    if (inactivados.count === 0) throw new ErrorNegocio(404, 'Usuario no encontrado'); // ya lo eliminaron
  });
}

// ---------- Cuenta propia para los tres roles ----------

// Lo que muestra la pantalla "Actualizar datos". El documento y el rol solo se leen.
const SELECCION_CUENTA = {
  nombres: true, apellidos: true, correo: true, rol: true, tipoDocumento: true, numeroDocumento: true,
};

// Datos de la cuenta de quien tiene la sesión. id y empresaId vienen del token.
export async function obtenerMiCuenta({ id, empresaId }) {
  const usuario = await prisma.usuario.findFirst({ where: { id, empresaId }, select: SELECCION_CUENTA });
  if (!usuario) throw new ErrorNegocio(404, 'Usuario no encontrado');
  return usuario;
}

// Actualiza SOLO nombres, apellidos y correo de la cuenta propia. No se pide la contraseña actual. El rol, el documento y el nombre de usuario
// no se tocan. "nombre" se recalcula.
export async function actualizarMiCuenta({ id, empresaId }, { nombres, apellidos, correo }) {
  const resultado = await prisma.usuario.updateMany({
    where: { id, empresaId },
    data: { nombres, apellidos, nombre: nombreCompleto(nombres, apellidos), correo },
  });
  if (resultado.count === 0) throw new ErrorNegocio(404, 'Usuario no encontrado');
  return obtenerMiCuenta({ id, empresaId });
}