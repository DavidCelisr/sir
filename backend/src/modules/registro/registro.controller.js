import * as service from './registro.service.js';

// GET /api/registro/invitaciones/:token (RF-06)
// El frontend lo llama al abrir el enlace, antes de mostrar el formulario.
export async function validarInvitacion(req, res) {
  const invitacion = await service.buscarInvitacionVigente(req.params.token);

  if (!invitacion) {
    // Mismo mensaje si no existe, está vencida o ya se usó: así nadie puede
    // averiguar qué tokens existen.
    return res.status(404).json({ error: 'La invitación no es válida o ya no está vigente' });
  }

  // Solo se confirma que sirve; no se devuelve ningún dato de la invitación
  res.json({ valida: true });
}