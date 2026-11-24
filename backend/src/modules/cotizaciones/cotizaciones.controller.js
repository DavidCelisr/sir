import * as service from './cotizaciones.service.js';
import {
  validarCotizacion, validarConsulta, validarBusquedaPiezas, validarDestino, validarIdCotizacion,
} from './cotizaciones.validacion.js';
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

const ID_INVALIDO = { error: 'El id de la cotización no es válido' };

// GET /api/portal/cotizaciones?busqueda=&pagina= : listado y búsqueda
export async function listar(req, res) {
  const { errores, datos } = validarConsulta(req.query);
  if (errores.length > 0) return res.status(400).json({ errores });
  res.json(await service.listarCotizaciones(actor(req), datos));
}

// GET /api/portal/cotizaciones/piezas?busqueda= : piezas para cotizar, con precio
export async function piezas(req, res) {
  const { errores, datos } = validarBusquedaPiezas(req.query);
  if (errores.length > 0) return res.status(400).json({ errores });
  res.json(await service.listarPiezasParaCotizar(actor(req), datos));
}

// POST /api/portal/cotizaciones : crear
export async function crear(req, res) {
  const { errores, datos } = validarCotizacion(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });
  try {
    res.status(201).json(await service.crearCotizacion(actor(req), datos));
  } catch (error) {
    responderError(res, error);
  }
}

// GET /api/portal/cotizaciones/:id : detalle completo
export async function ver(req, res) {
  const id = validarIdCotizacion(req.params.id);
  if (id === null) return res.status(400).json(ID_INVALIDO);
  try {
    res.json(await service.obtenerCotizacion(actor(req), id));
  } catch (error) {
    responderError(res, error);
  }
}

// POST /api/portal/cotizaciones/:id/enviar : enviar por correo (simulado)
export async function enviar(req, res) {
  const id = validarIdCotizacion(req.params.id);
  if (id === null) return res.status(400).json(ID_INVALIDO);
  const { errores, datos } = validarDestino(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });
  try {
    res.json(await service.enviarCotizacion(actor(req), id, datos));
  } catch (error) {
    responderError(res, error);
  }
}