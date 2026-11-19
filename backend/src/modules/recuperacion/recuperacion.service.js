import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { ErrorNegocio } from '../../lib/errores.js';
import { enviarCorreo } from '../../lib/correo.js';

// valores de negocio: vigencia del código, intentos y tiempo de espera entre solicitudes
const VIGENCIA_MINUTOS = 10;
const MAX_INTENTOS = 5;
const ESPERA_SEGUNDOS = 60;

// Mensajes de la solicitud de recuperación
const MSG_NO_ENCONTRADA =
  'No se pudo encontrar una cuenta para el ID de usuario proporcionado';

const MSG_NO_HABILITADA =
  'La cuenta no está habilitada. Comuníquese con el administrador de su empresa'; 

// Un solo mensaje para todo código malo: incorrecto, vencido, usado o sin intentos
const MSG_CODIGO_INVALIDO = 'El código es inválido o ya venció';

// Hash de relleno para igualar tiempos de respuesta
const HASH_FALSO = bcrypt.hashSync('codigo-que-nadie-usa', 12);

// Código de 6 dígitos con aleatoriedad criptográfica
const generarCodigo = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

// Solo se recupera la clave de cuentas activas de empresas activas
const cuentaHabilitada = (u) => u && u.activo && u.empresa.estado === 'ACTIVA';

// PASO 1 (RF-11): verifica que el usuario exista y le envía el código.
// Devuelve { enviado, segundosEspera }; lanza un error si no puede continuar.
export async function solicitarCodigo(nombreUsuario) {
  const usuario = await prisma.usuario.findUnique({
    where: { nombreUsuario },
    include: { empresa: { select: { estado: true } } },
  });

  // Si no existe, se informa
  if (!usuario) {
    throw new ErrorNegocio(404, MSG_NO_ENCONTRADA);
  }

  // Solo se recupera la clave de cuentas activas de empresas activas (RN-29)
  if (!cuentaHabilitada(usuario)) {
    throw new ErrorNegocio(403, MSG_NO_HABILITADA);
  }

  // Espera entre solicitudes: si se emitió un código hace poco,
  // no se envía otro y se informa cuánto tiempo falta
  const ultimo = await prisma.codigoRecuperacion.findFirst({
    where: { usuarioId: usuario.id },
    orderBy: { creadoEn: 'desc' },
    select: { creadoEn: true },
  });

  if (ultimo) {
    const faltanMs =
      ESPERA_SEGUNDOS * 1000 -
      (Date.now() - ultimo.creadoEn.getTime());

    if (faltanMs > 0) {
      return {
        enviado: false,
        segundosEspera: Math.ceil(faltanMs / 1000),
      };
    }
  }

  const codigo = generarCodigo();
  const codigoHash = await bcrypt.hash(codigo, 12);
  const ahora = new Date();

  try {
    // Un solo código vigente: se invalidan los anteriores y se crea el nuevo,
    // todo en una transacción
    await prisma.$transaction([
      prisma.codigoRecuperacion.updateMany({
        where: { usuarioId: usuario.id, usadoEn: null },
        data: { usadoEn: ahora },
      }),
      prisma.codigoRecuperacion.create({
        data: {
          usuarioId: usuario.id,
          empresaId: usuario.empresaId, // la empresa sale de la base, nunca del cliente
          codigoHash,
          expiraEn: new Date(
            ahora.getTime() + VIGENCIA_MINUTOS * 60 * 1000
          ),
          creadoEn: ahora, // fijado desde el servidor
        },
      }),
    ]);
  } catch (error) {
    // Dos solicitudes simultáneas: el índice único dejó pasar solo a una
    if (error.code === 'P2002') {
      return {
        enviado: false,
        segundosEspera: ESPERA_SEGUNDOS,
      };
    }

    throw error;
  }

  // Fuera de la transacción: si el correo falla, el código ya existe
  try {
    await enviarCorreo({
      para: usuario.correo,
      asunto: 'Código de recuperación de contraseña del SIR',
      texto: `Su código es: ${codigo}\nVence en ${VIGENCIA_MINUTOS} minutos. Si no lo solicitó, ignore este mensaje.`,
    });
  } catch (error) {
    console.error(
      'No se pudo enviar el código de recuperación:',
      error.message
    );
  }

  return {
    enviado: true,
    segundosEspera: ESPERA_SEGUNDOS,
  };
}

// PASO 2: valida el código y establece la nueva contraseña
export async function restablecerPassword({ nombreUsuario, codigo, passwordNueva }) {
  const invalido = () => new ErrorNegocio(400, MSG_CODIGO_INVALIDO);

  const usuario = await prisma.usuario.findUnique({
    where: { nombreUsuario },
    include: { empresa: { select: { estado: true } } },
  });
  if (!cuentaHabilitada(usuario)) {
    await bcrypt.compare(codigo, HASH_FALSO); // iguala el tiempo de respuesta
    throw invalido();
  }

  // Código vigente: sin usar, sin vencer y con intentos disponibles
  const activo = await prisma.codigoRecuperacion.findFirst({
    where: { usuarioId: usuario.id, usadoEn: null, expiraEn: { gt: new Date() }, intentos: { lt: MAX_INTENTOS } },
    orderBy: { creadoEn: 'desc' },
  });
  if (!activo) {
    await bcrypt.compare(codigo, HASH_FALSO);
    throw invalido();
  }

  // Se consume el intento ANTES de comparar, con un solo UPDATE condicional:
  // así el límite de 5 se respeta aunque lleguen muchas peticiones a la vez.
  const intento = await prisma.codigoRecuperacion.updateMany({
    where: { id: activo.id, usadoEn: null, expiraEn: { gt: new Date() }, intentos: { lt: MAX_INTENTOS } },
    data: { intentos: { increment: 1 } },
  });
  if (intento.count === 0) throw invalido();

  const correcto = await bcrypt.compare(codigo, activo.codigoHash);
  if (!correcto) throw invalido();

  // Se hashea antes de abrir la transacción: bcrypt es lento y no conviene retenerla
  const passwordHash = await bcrypt.hash(passwordNueva, 12);

  await prisma.$transaction(async (tx) => {
    // Se reclama el código con un UPDATE condicional: solo una petición lo logra
    const reclamado = await tx.codigoRecuperacion.updateMany({
      where: { id: activo.id, usadoEn: null },
      data: { usadoEn: new Date() },
    });
    if (reclamado.count === 0) throw invalido();

    await tx.usuario.update({ where: { id: usuario.id }, data: { passwordHash } });
  });
}