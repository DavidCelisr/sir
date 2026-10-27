import * as service from './auth.service.js';
import { ErrorNegocio } from '../../lib/errores.js';

// POST /api/auth/login
export async function login(req, res) {
  const { nombreUsuario, password } = req.body ?? {};

  // typeof evita que envíen un objeto en lugar de un texto y manipulen la consulta
  if (typeof nombreUsuario !== 'string' || typeof password !== 'string' || !nombreUsuario || !password) {
    return res.status(400).json({ error: 'nombreUsuario y password son obligatorios' });
  }

  try {
    res.json(await service.login(nombreUsuario, password));
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return res.status(error.estado).json({ error: error.message });
    }
    throw error; // inesperado: Express responde 500
  }
}