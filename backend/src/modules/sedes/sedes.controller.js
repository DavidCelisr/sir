import * as service from './sedes.service.js';
import { validarSede, validarIdSede } from './sedes.validacion.js';
import { ErrorNegocio } from '../../lib/errores.js';

// Responde los errores esperados del negocio con su código HTTP; los inesperados siguen a Express (500)
function responderError(res, error) {
  if (error instanceof ErrorNegocio) {
    return res.status(error.estado).json({ error: error.message });
  }
  throw error;
}

// La empresa sale SIEMPRE del token firmado, nunca del cuerpo ni de la URL
const actor = (req) => ({ empresaId: req.auth.empresaId });

const ID_INVALIDO = { error: 'El id de la sede no es válido' };

// GET /api/portal/sedes : lista de sedes activas (Administrador y Técnico Líder)
export async function listar(req, res) {
  res.json(await service.listarSedes(actor(req)));
}

// POST /api/portal/sedes : crear (solo el Administrador)
export async function crear(req, res) {
  const { errores, datos } = validarSede(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });
  try {
    res.status(201).json(await service.crearSede(actor(req), datos));
  } catch (error) {
    responderError(res, error);
  }
}

// PATCH /api/portal/sedes/:id : editar nombre, dirección, departamento y ciudad (solo el Administrador)
export async function editar(req, res) {
  const id = validarIdSede(req.params.id);
  if (id === null) return res.status(400).json(ID_INVALIDO);
  const { errores, datos } = validarSede(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });
  try {
    res.json(await service.editarSede(actor(req), id, datos));
  } catch (error) {
    responderError(res, error);
  }
}

// POST /api/portal/sedes/:id/principal : designar como principal (solo el Administrador). No recibe cuerpo.
export async function principal(req, res) {
  const id = validarIdSede(req.params.id);
  if (id === null) return res.status(400).json(ID_INVALIDO);
  try {
    res.json(await service.designarPrincipal(actor(req), id));
  } catch (error) {
    responderError(res, error);
  }
}

// DELETE /api/portal/sedes/:id : eliminar = inactivar (solo el Administrador)
export async function eliminar(req, res) {
  const id = validarIdSede(req.params.id);
  if (id === null) return res.status(400).json(ID_INVALIDO);
  try {
    await service.eliminarSede(actor(req), id);
    res.status(204).end(); // sin cuerpo: no hay nada que devolver
  } catch (error) {
    responderError(res, error);
  }
}