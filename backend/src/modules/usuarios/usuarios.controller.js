import * as service from './usuarios.service.js';
import { validarSubperfil } from './usuarios.validacion.js';
import { ErrorNegocio } from '../../lib/errores.js';

// POST /api/portal/usuarios
export async function crearSubperfil(req, res) {
  const { errores, datos } = validarSubperfil(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });

  try {
    const usuario = await service.crearSubperfil(
      // Quién crea y de qué empresa: siempre del token firmado
      { empresaId: req.auth.empresaId, rolCreador: req.auth.rol },
      datos,
    );
    res.status(201).json(usuario);
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return res.status(error.estado).json({ error: error.message });
    }
    throw error; // inesperado: Express responde 500
  }
}