import * as service from './sesion.service.js';
import { ErrorNegocio } from '../../lib/errores.js';

// GET /api/portal/sesion: el frontend lo llama al recargar para validar el token
export async function obtenerSesion(req, res) {
  try {
    // el que consulta: siempre el dueño del token
    res.json(await service.obtenerSesion({ id: req.auth.id, empresaId: req.auth.empresaId }));
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return res.status(error.estado).json({ error: error.message });
    }
    throw error; // inesperado: Express responde 500
  }
}