import * as service from './superadmin.service.js';

export async function login(req, res) {
  const { nombreUsuario, password } = req.body ?? {};

  if (typeof nombreUsuario !== 'string' || typeof password !== 'string' || !nombreUsuario || !password) {
    return res.status(400).json({ error: 'nombreUsuario y password son obligatorios' });
  }

  const token = await service.login(nombreUsuario, password);
  if (!token) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  res.json({ token });
}