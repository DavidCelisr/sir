import * as service from './invitaciones.service.js';

export async function generar(req, res) {
  const invitacion = await service.generarInvitacion();
  res.status(201).json(invitacion);
}