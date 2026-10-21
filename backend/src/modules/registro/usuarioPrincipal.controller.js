import * as service from './usuarioPrincipal.service.js';
import { validarUsuarioPrincipal } from './usuarioPrincipal.validacion.js';
import { ErrorNegocio } from '../../lib/errores.js';

// POST /api/registro/usuario-principal (RF-09, RF-10)
export async function crearUsuarioPrincipal(req, res) {
  const { errores, datos } = validarUsuarioPrincipal(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });

  try {
    const usuario = await service.crearUsuarioPrincipal(datos);
    res.status(201).json(usuario);
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return res.status(error.estado).json({ error: error.message });
    }
    throw error; // inesperado: Express responde 500
  }
}