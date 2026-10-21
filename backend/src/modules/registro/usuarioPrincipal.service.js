import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { ErrorNegocio } from '../../lib/errores.js';
import { enviarCorreo } from '../../lib/correo.js';

// Mensaje definido en RF-09 / 5.2
const MSG_YA_TIENE_ADMIN = 'La empresa ya tiene un usuario principal/administrador asignado';
const MSG_USUARIO_EN_USO = 'Ese nombre de usuario ya está en uso';

// RF-09, RF-10, RT-07: crea el administrador de una empresa registrada
export async function crearUsuarioPrincipal({ tipoDocumento, numeroDocumento, nombreUsuario, password }) {
  // 1. Ubicar la empresa por su documento (RT-07). El dígito de verificación no participa (D-02).
  const empresa = await prisma.empresa.findUnique({
    where: {
      tipoIdentificacion_numeroIdentificacion: {
        tipoIdentificacion: tipoDocumento,
        numeroIdentificacion: numeroDocumento,
      },
    },
    include: { responsable: true }, // aqui se obtiene el nombre y el correo registrado
  });
  if (!empresa) {
    // Mensaje provisional: UC-06 no define qué responder si no coincide
    throw new ErrorNegocio(404, 'No hay una empresa registrada con ese documento');
  }

  // 2. RN-04: una empresa solo puede tener un usuario principal
  const yaTieneAdmin = await prisma.usuario.findFirst({
    where: { empresaId: empresa.id, rol: 'ADMINISTRADOR' },
    select: { id: true },
  });
  if (yaTieneAdmin) throw new ErrorNegocio(409, MSG_YA_TIENE_ADMIN);

  // 3. El nombre de usuario es único en todo el sistema (el login es un portal único)
  const enUso = await prisma.usuario.findUnique({ where: { nombreUsuario }, select: { id: true } });
  if (enUso) throw new ErrorNegocio(409, MSG_USUARIO_EN_USO);

  // 4. Nunca se guarda la contraseña, solo su hash
  const passwordHash = await bcrypt.hash(password, 12);

  const r = empresa.responsable;
  let usuario;
  try {
    usuario = await prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        rol: 'ADMINISTRADOR', // lo fija el servidor, nunca el cliente
        nombre: `${r.nombres} ${r.apellidos}`,
        nombreUsuario,
        correo: r.correo, // el correo registrado de la empresa (RF-10)
        passwordHash,
      },
      select: { nombreUsuario: true, rol: true }, // no se devuelve el hash
    });
  } catch (error) {
    // Dos peticiones simultáneas pueden pasar los controles de arriba;
    // la base de datos (índices únicos) decide cuál gana.
    if (error.code === 'P2002') {
      const hayAdmin = await prisma.usuario.findFirst({
        where: { empresaId: empresa.id, rol: 'ADMINISTRADOR' },
        select: { id: true },
      });
      throw new ErrorNegocio(409, hayAdmin ? MSG_YA_TIENE_ADMIN : MSG_USUARIO_EN_USO);
    }
    throw error;
  }

  // confirmación con usuario y rol (si el correo falla, el usuario ya existe)
  try {
    await enviarCorreo({
      para: r.correo,
      asunto: 'Su usuario del SIR fue creado',
      texto: `Usuario: ${usuario.nombreUsuario}\nRol: Administrador de empresa`,
    });
  } catch (error) {
    console.error('No se pudo enviar la confirmación:', error.message);
  }

  return usuario;
}