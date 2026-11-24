import * as service from './clientes.service.js';
import {
  validarBusqueda, validarDocumentoConsulta, validarCliente, validarIdCliente,
} from './clientes.validacion.js';
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

// GET /api/portal/clientes?busqueda=&pagina= : buscador general (los tres roles)
export async function buscar(req, res) {
  const { errores, datos } = validarBusqueda(req.query);
  if (errores.length > 0) return res.status(400).json({ errores });
  res.json(await service.buscarClientes(actor(req), datos));
}

// GET /api/portal/clientes/por-documento?tipoDocumento=&numeroDocumento= : Administrador y Líder
export async function porDocumento(req, res) {
  const { errores, datos } = validarDocumentoConsulta(req.query);
  if (errores.length > 0) return res.status(400).json({ errores });
  try {
    res.json(await service.buscarPorDocumento(actor(req), datos));
  } catch (error) {
    responderError(res, error);
  }
}

// GET /api/portal/clientes/:id : ficha con datos personales y de contacto (los tres roles)
export async function ver(req, res) {
  const id = validarIdCliente(req.params.id);
  if (id === null) return res.status(400).json({ error: 'El id del cliente no es válido' });
  try {
    res.json(await service.obtenerCliente(actor(req), id));
  } catch (error) {
    responderError(res, error);
  }
}

// PATCH /api/portal/clientes/:id : corregir los datos (Administrador y Líder, desde el detalle de un caso)
export async function editar(req, res) {
  const id = validarIdCliente(req.params.id);
  if (id === null) return res.status(400).json({ error: 'El id del cliente no es válido' });

  const { errores, datos } = validarCliente(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });
  try {
    res.json(await service.editarCliente(actor(req), id, datos));
  } catch (error) {
    responderError(res, error);
  }
}