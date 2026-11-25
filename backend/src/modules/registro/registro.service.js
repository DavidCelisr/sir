import { prisma } from '../../lib/prisma.js';
import { ErrorNegocio } from '../../lib/errores.js';
import { enviarCorreo } from '../../lib/correo.js';

// Usada por GET /invitaciones/:token (consulta, no consume el token)
export async function buscarInvitacionVigente(token) {
  return prisma.invitacion.findFirst({
    where: { token, usadaEn: null, expiraEn: { gt: new Date() } },
  });
}

// registra la empresa y consume la invitación
export async function registrarEmpresa(token, datosEmpresa, datosResponsable) {
  // Transacción: si algo falla, TODO se revierte (incluido el uso del token)
  const empresa = await prisma.$transaction(async (tx) => {
    // 1. Reclamar la invitación con un solo UPDATE condicional. Si dos peticiones
    //    llegan a la vez, solo una lo logra.
    const reclamada = await tx.invitacion.updateMany({
      where: { token, usadaEn: null, expiraEn: { gt: new Date() } },
      data: { usadaEn: new Date() },
    });
    if (reclamada.count === 0) {
      throw new ErrorNegocio(404, 'La invitación no es válida o ya no está vigente');
    }

    // 2. Revisar el documento antes de insertar, para no gastar un número de contrato
    const existente = await tx.empresa.findUnique({
      where: {
        tipoIdentificacion_numeroIdentificacion: {
          tipoIdentificacion: datosEmpresa.tipoIdentificacion,
          numeroIdentificacion: datosEmpresa.numeroIdentificacion,
        },
      },
    });
    if (existente) {
      throw new ErrorNegocio(409, 'Ya existe una empresa registrada con ese documento');
    }

    // 3. Crear Empresa y Responsable juntas. El número de contrato lo asigna
    //    solo la base de datos.
    const nueva = await tx.empresa.create({
      data: { ...datosEmpresa, responsable: { create: datosResponsable } },
    });

    // cada empresa nace con su sede principal y su ubicación de registro
    // Se crea en la misma transacción para evitar empresas sin sede.
    await tx.sede.create({
      data: {
        empresaId: nueva.id,
        nombre: 'Sede principal',
        departamento: datosEmpresa.departamento,
        ciudad: datosEmpresa.ciudad,
        esPrincipal: true,
      },
    });

    // 4. Dejar la invitación asociada a la empresa creada
    await tx.invitacion.update({ where: { token }, data: { empresaId: nueva.id } });

    return nueva;
  });

  // Fuera de la transacción: si el correo falla, el registro ya es válido
  try {
    await enviarCorreo({
      para: datosResponsable.correo,
      asunto: 'Bienvenido al SIR',
      texto:
        `Su empresa quedó registrada en el SIR.\n` +
        `Ingrese al portal para crear su usuario: ${process.env.FRONTEND_URL}/portal`,
    });
  } catch (error) {
    console.error('No se pudo enviar el correo de bienvenida:', error.message);
  }

  return { numeroContrato: empresa.numeroContrato };
}