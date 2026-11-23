import * as service from './inventario.service.js';
import { validarPieza, validarAjuste, validarConsulta, validarIdPieza } from './inventario.validacion.js';
import { ErrorNegocio } from '../../lib/errores.js';

// Responde los errores esperados del negocio con su código HTTP; los inesperados siguen a Express (500)
function responderError(res, error) {
  if (error instanceof ErrorNegocio) {
    return res.status(error.estado).json({ error: error.message });
  }
  throw error;
}

// Quién actúa y de qué empresa: SIEMPRE del token firmado, nunca del cuerpo
const actor = (req) => ({ empresaId: req.auth.empresaId, usuarioId: req.auth.id });

const ID_INVALIDO = { error: 'El id de la pieza no es válido' };

// GET /api/portal/inventario?busqueda=&pagina= : listado
export async function listar(req, res) {
  const { errores, datos } = validarConsulta(req.query);
  if (errores.length > 0) return res.status(400).json({ errores });
  res.json(await service.listarPiezas(actor(req), datos));
}

// GET /api/portal/inventario/:id : detalles
export async function ver(req, res) {
  const id = validarIdPieza(req.params.id);
  if (id === null) return res.status(400).json(ID_INVALIDO);
  try {
    res.json(await service.obtenerPieza(actor(req), id));
  } catch (error) {
    responderError(res, error);
  }
}

// GET /api/portal/inventario/:id/historial : historial propio de la pieza
export async function historial(req, res) {
  const id = validarIdPieza(req.params.id);
  if (id === null) return res.status(400).json(ID_INVALIDO);
  const { errores, datos } = validarConsulta(req.query);
  if (errores.length > 0) return res.status(400).json({ errores });
  try {
    res.json(await service.listarHistorial(actor(req), id, datos));
  } catch (error) {
    responderError(res, error);
  }
}

// POST /api/portal/inventario : crear
export async function crear(req, res) {
  const { errores, datos } = validarPieza(req.body, { esAlta: true });
  if (errores.length > 0) return res.status(400).json({ errores });
  try {
    res.status(201).json(await service.crearPieza(actor(req), datos));
  } catch (error) {
    responderError(res, error);
  }
}

// PATCH /api/portal/inventario/:id : editar código, nombre, precio y mínimo (no las existencias)
export async function editar(req, res) {
  const id = validarIdPieza(req.params.id);
  if (id === null) return res.status(400).json(ID_INVALIDO);
  const { errores, datos } = validarPieza(req.body, { esAlta: false });
  if (errores.length > 0) return res.status(400).json({ errores });
  try {
    res.json(await service.editarPieza(actor(req), id, datos));
  } catch (error) {
    responderError(res, error);
  }
}

// POST /api/portal/inventario/:id/ajuste : sumar o restar existencias
export async function ajustar(req, res) {
  const id = validarIdPieza(req.params.id);
  if (id === null) return res.status(400).json(ID_INVALIDO);
  const { errores, datos } = validarAjuste(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });
  try {
    res.json(await service.ajustarExistencias(actor(req), id, datos));
  } catch (error) {
    responderError(res, error);
  }
}

// DELETE /api/portal/inventario/:id : eliminar (inactivación lógica)
export async function eliminar(req, res) {
  const id = validarIdPieza(req.params.id);
  if (id === null) return res.status(400).json(ID_INVALIDO);
  try {
    await service.eliminarPieza(actor(req), id);
    res.status(204).end(); // sin cuerpo: no hay nada que devolver
  } catch (error) {
    responderError(res, error);
  }
}