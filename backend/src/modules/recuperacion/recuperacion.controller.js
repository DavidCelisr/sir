import * as service from './recuperacion.service.js';
import { validarSolicitud, validarRestablecer } from './recuperacion.validacion.js';
import { ErrorNegocio } from '../../lib/errores.js';

// Siempre la misma respuesta, exista o no el usuario
const MSG_ENVIADO = 'Enviamos un código de verificación al correo registrado'

// POST /api/auth/recuperar/solicitar 
export async function solicitar(req, res) {
  const { errores, datos } = validarSolicitud(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });

  try {
    const { enviado, segundosEspera } = await service.solicitarCodigo(datos.nombreUsuario);
    res.json({
      mensaje: enviado
        ? MSG_ENVIADO
        : `Ya enviamos un código hace poco. Use ese código o espere ${segundosEspera} segundos para solicitar otro`,
      segundosEspera, // el frontend lo usa para la cuenta regresiva de "Reenviar código"
    });
  } catch (error) {
    // 404 usuario inexistente y 403 cuenta no habilitada llevan su propio mensaje
    if (error instanceof ErrorNegocio) {
      return res.status(error.estado).json({ error: error.message });
    }
    throw error; // inesperado: Express responde 500
  }
}

// POST /api/auth/recuperar/restablecer
export async function restablecer(req, res) {
  // El formato se valida antes: una clave mal escrita no debe gastar intentos del código
  const { errores, datos } = validarRestablecer(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });

  try {
    await service.restablecerPassword(datos);
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return res.status(error.estado).json({ error: error.message });
    }
    throw error; // inesperado: Express responde 500
  }
}