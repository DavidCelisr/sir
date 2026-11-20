import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { ErrorNegocio } from '../../lib/errores.js';

// roles que puede crear cada rol. El Administrador solo nace en el
// registro autogestionado, por eso no figura como creable.
const ROLES_CREABLES = {
  ADMINISTRADOR: ['TECNICO_LIDER', 'TECNICO'],
  TECNICO_LIDER: ['TECNICO'],
};

const MSG_YA_TIENE_LIDER = 'La empresa ya tiene un Técnico Líder'; // mensaje provisional (UC-10)
const MSG_USUARIO_EN_USO = 'Ese nombre de usuario ya está en uso';

// empresaId y rolCreador vienen del token (req.auth), NUNCA del cuerpo
export async function crearSubperfil({ empresaId, rolCreador }, { rol, nombre, correo, nombreUsuario, password }) {
  // 1. ¿Este rol puede crear ese tipo de usuario?
  if (!(ROLES_CREABLES[rolCreador] ?? []).includes(rol)) {
    throw new ErrorNegocio(403, 'No tiene permiso para crear ese tipo de usuario');
  }

  // 2. un solo Técnico Líder por empresa
  if (rol === 'TECNICO_LIDER') {
    const yaHay = await prisma.usuario.findFirst({
      where: { empresaId, rol: 'TECNICO_LIDER' },
      select: { id: true },
    });
    if (yaHay) throw new ErrorNegocio(409, MSG_YA_TIENE_LIDER);
  }

  // 3. El nombre de usuario es único en todo el sistema (el login es un portal único)
  const enUso = await prisma.usuario.findUnique({ where: { nombreUsuario }, select: { id: true } });
  if (enUso) throw new ErrorNegocio(409, MSG_USUARIO_EN_USO);

  // 4. Nunca se guarda la contraseña, solo su hash
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    return await prisma.usuario.create({
      data: { empresaId, rol, nombre, correo, nombreUsuario, passwordHash },
      // No se devuelve el hash
      select: { id: true, nombre: true, nombreUsuario: true, correo: true, rol: true, activo: true },
    });
  } catch (error) {
    // Dos peticiones simultáneas pueden pasar los controles de arriba;
    // los índices únicos de la base de datos deciden cuál gana.
    if (error.code === 'P2002') {
      const hayLider =
        rol === 'TECNICO_LIDER' &&
        (await prisma.usuario.findFirst({ where: { empresaId, rol: 'TECNICO_LIDER' }, select: { id: true } }));
      throw new ErrorNegocio(409, hayLider ? MSG_YA_TIENE_LIDER : MSG_USUARIO_EN_USO);
    }
    throw error;
  }
}

// cambiar password: id y empresaId vienen del token (req.auth), NUNCA del cuerpo
export async function cambiarPassword({ id, empresaId }, { passwordActual, passwordNueva }) {
  // Se busca por id Y empresaId
  const usuario = await prisma.usuario.findFirst({
    where: { id, empresaId },
    select: { id: true, passwordHash: true },
  });
  if (!usuario) throw new ErrorNegocio(404, 'Usuario no encontrado');

  // Exigir la clave actual
  const claveCorrecta = await bcrypt.compare(passwordActual, usuario.passwordHash);
  if (!claveCorrecta) throw new ErrorNegocio(400, 'La contraseña actual es incorrecta');

  // Nunca se guarda la contraseña, solo su hash
  const passwordHash = await bcrypt.hash(passwordNueva, 12);
  await prisma.usuario.update({ where: { id: usuario.id }, data: { passwordHash } });
}
// ---gestión de usuarios (solo el Administrador) ----------

const MSG_ADMIN_PROTEGIDO = 'El usuario administrador no se puede modificar ni eliminar desde aquí';

// Campos que se devuelven. Nunca el hash de la contraseña ni la empresa.
const SELECCION = { id: true, nombre: true, nombreUsuario: true, rol: true, correo: true, creadoEn: true };

// soloLectura le indica al frontend que no debe ofrecer editar ni eliminar al Administrador
const conSoloLectura = (u) => ({ ...u, soloLectura: u.rol === 'ADMINISTRADOR' });

// Lista los usuarios de la empresa. empresaId viene del token.
export async function listarUsuarios({ empresaId }, { rol }) {
  const usuarios = await prisma.usuario.findMany({
    // El rol solo se agrega al filtro si llegó: con "rol: undefined"
    where: { empresaId, ...(rol ? { rol } : {}) },
    // Los enums se ordenan como se declararon: ADMINISTRADOR, TECNICO_LIDER, TECNICO
    orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
    select: SELECCION,
  });
  return usuarios.map(conSoloLectura);
}

// Busca al usuario por id Y empresaId. Si es de otra empresa responde "no encontrado"
// y no "prohibido", para no confirmar que existe. El Administrador no se gestiona desde aquí.
async function buscarGestionable(empresaId, id) {
  const usuario = await prisma.usuario.findFirst({ where: { id, empresaId }, select: { id: true, rol: true } });
  if (!usuario) throw new ErrorNegocio(404, 'Usuario no encontrado');
  if (usuario.rol === 'ADMINISTRADOR') throw new ErrorNegocio(403, MSG_ADMIN_PROTEGIDO);
  return usuario;
}

// Edita nombre y correo. El correo editado es el que recibe los códigos de recuperación.
export async function editarUsuario({ empresaId }, id, { nombre, correo }) {
  await buscarGestionable(empresaId, id);

  // La escritura repite empresaId y "no administrador": aunque la revisión de arriba fallara,
  // esta condición impide tocar a un administrador o a un usuario de otra empresa.
  const resultado = await prisma.usuario.updateMany({
    where: { id, empresaId, rol: { not: 'ADMINISTRADOR' } },
    data: { nombre, correo },
  });
  if (resultado.count === 0) throw new ErrorNegocio(404, 'Usuario no encontrado'); // lo eliminaron en medio

  const usuario = await prisma.usuario.findFirst({ where: { id, empresaId }, select: SELECCION });
  return conSoloLectura(usuario);
}

// PROVISIONAL: el módulo de Casos todavía no existe, así que no hay casos que contar.
// Cuando exista, debe contar los casos del usuario cuyo estado NO sea Cerrado ni Cancelado
// (un caso "abierto" es cualquier otro). Recibe el cliente de la transacción (tx) para que
// la comprobación y el borrado ocurran juntos y nadie pueda asignarle un caso en medio.
// eslint-disable-next-line no-unused-vars
async function contarCasosAbiertos(tx, usuarioId, empresaId) {
  return 0;
}

// Elimina definitivamente a un usuario (decisión del módulo). Se permite si no tiene casos
// abiertos; los casos cerrados y demás historial NO lo impiden. El historial debe conservar
// el nombre registrado en el momento de cada acción.
// No hay reasignación automática: si tiene casos abiertos, se reasignan a mano antes.
export async function eliminarUsuario({ empresaId }, id) {
  await buscarGestionable(empresaId, id);

  try {
    await prisma.$transaction(async (tx) => {
      const abiertos = await contarCasosAbiertos(tx, id, empresaId);
      if (abiertos > 0) {
        throw new ErrorNegocio(
          409,
          `El usuario tiene ${abiertos} caso(s) abierto(s) asignado(s). Reasígnelos antes de eliminarlo`,
        );
      }

      // Los códigos de recuperación no son historial: se van con la cuenta
      await tx.codigoRecuperacion.deleteMany({ where: { usuarioId: id, empresaId } });

      // La condición repite empresaId y "no administrador"
      const borrados = await tx.usuario.deleteMany({ where: { id, empresaId, rol: { not: 'ADMINISTRADOR' } } });
      if (borrados.count === 0) throw new ErrorNegocio(404, 'Usuario no encontrado'); // ya lo eliminaron
    });
  } catch (error) {
    // P2003 = otra tabla referencia al usuario y bloquea el borrado. Por diseño NO debería
    // pasar: el historial debe guardar el nombre y no depender de que la cuenta exista.
    if (error.code === 'P2003') {
      console.error('Un registro referencia al usuario y bloquea su eliminación:', error.meta);
      throw new ErrorNegocio(409, 'No se puede eliminar: hay registros que dependen de este usuario');
    }
    throw error;
  }
}