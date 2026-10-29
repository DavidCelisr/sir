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