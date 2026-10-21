import * as service from './registro.service.js';
import { validarRegistro } from './registro.validacion.js';
import { ErrorNegocio } from '../../lib/errores.js';

// GET /api/registro/invitaciones/:token (RF-06)
export async function validarInvitacion(req, res) {
  const invitacion = await service.buscarInvitacionVigente(req.params.token);
  if (!invitacion) {
    return res.status(404).json({ error: 'La invitación no es válida o ya no está vigente' });
  }
  res.json({ valida: true });
}

// POST /api/registro/empresas (RF-06, RF-07)
export async function registrarEmpresa(req, res) {
  // Primero se valida el formato; nada toca la base si hay errores
  const { errores, token, empresa, responsable } = validarRegistro(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });

  try {
    const resultado = await service.registrarEmpresa(token, empresa, responsable);
    res.status(201).json(resultado);
  } catch (error) {
    // Errores esperados del negocio llevan su propio código HTTP
    if (error instanceof ErrorNegocio) {
      return res.status(error.estado).json({ error: error.message });
    }
    throw error; // inesperado: Express responde 500
  }
}