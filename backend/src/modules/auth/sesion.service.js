import { prisma } from '../../lib/prisma.js';
import { ErrorNegocio } from '../../lib/errores.js';

// Datos de la sesion: el usuario y su empresa. id y empresaId vienen del token
export async function obtenerSesion({ id, empresaId }) {
  const usuario = await prisma.usuario.findFirst({
    where: { id, empresaId },
    select: {
      nombre: true,
      nombreUsuario: true,
      rol: true,
      empresa: {
        select: {
          tipoAfiliacion: true,
          razonSocial: true,
          responsable: { select: { nombres: true, apellidos: true } },
        },
      },
    },
  });
  if (!usuario) throw new ErrorNegocio(404, 'Usuario no encontrado');

  const { empresa } = usuario;
  // La persona natural no tiene razón social: se muestra el nombre del titular
  const nombreEmpresa =
    empresa.tipoAfiliacion === 'PERSONA_JURIDICA'
      ? empresa.razonSocial
      : empresa.responsable
        ? `${empresa.responsable.nombres} ${empresa.responsable.apellidos}`
        : null;

  return {
    usuario: { nombre: usuario.nombre, nombreUsuario: usuario.nombreUsuario, rol: usuario.rol },
    empresa: { nombre: nombreEmpresa ?? 'Empresa', tipoAfiliacion: empresa.tipoAfiliacion },
  };
}