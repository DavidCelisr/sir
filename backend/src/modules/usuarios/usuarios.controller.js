import * as service from './usuarios.service.js';
import {
  validarSubperfil, validarCambioPassword, validarFiltroUsuarios, validarEdicion, validarIdUsuario,
} from './usuarios.validacion.js';
import { ErrorNegocio } from '../../lib/errores.js';


// POST /api/portal/usuarios
export async function crearSubperfil(req, res) {
  const { errores, datos } = validarSubperfil(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });

  try {
    const usuario = await service.crearSubperfil(
      // Quién crea y de qué empresa: siempre del token firmado
      { empresaId: req.auth.empresaId, rolCreador: req.auth.rol },
      datos,
    );
    res.status(201).json(usuario);
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return res.status(error.estado).json({ error: error.message });
    }
    throw error; // inesperado: Express responde 500
  }
}

// funcion para cambiar la contraseña del usuario logueado
export async function cambiarPassword(req, res) {
  const { errores, datos } = validarCambioPassword(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });

  try {
    // Quién cambia su clave: siempre el dueño del token
    await service.cambiarPassword({ id: req.auth.id, empresaId: req.auth.empresaId }, datos);
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return res.status(error.estado).json({ error: error.message });
    }
    throw error; // inesperado: Express responde 500
  }
}
// Responde los errores esperados del negocio con su código HTTP; los inesperados siguen a Express (500)
function responderError(res, error) {
  if (error instanceof ErrorNegocio) {
    return res.status(error.estado).json({ error: error.message });
  }
  throw error;
}

// GET /api/portal/usuarios?rol=...
export async function listar(req, res) {
  const { errores, datos } = validarFiltroUsuarios(req.query);
  if (errores.length > 0) return res.status(400).json({ errores });

  // La empresa sale del token, nunca de la petición
  res.json(await service.listarUsuarios({ empresaId: req.auth.empresaId }, datos));
}

// PATCH /api/portal/usuarios/:id: edita nombre y correo
export async function editar(req, res) {
  const id = validarIdUsuario(req.params.id);
  if (id === null) return res.status(400).json({ error: 'El id del usuario no es válido' });

  const { errores, datos } = validarEdicion(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });

  try {
    res.json(await service.editarUsuario({ empresaId: req.auth.empresaId }, id, datos));
  } catch (error) {
    responderError(res, error);
  }
}

// DELETE /api/portal/usuarios/:id: elimina definitivamente
export async function eliminar(req, res) {
  const id = validarIdUsuario(req.params.id);
  if (id === null) return res.status(400).json({ error: 'El id del usuario no es válido' });

  try {
    await service.eliminarUsuario({ empresaId: req.auth.empresaId }, id);
    res.status(204).end(); // sin cuerpo: no hay nada que devolver
  } catch (error) {
    responderError(res, error);
  }
}
// GET /api/portal/usuarios/mi-cuenta: datos de la cuenta de quien tiene la sesión
export async function verMiCuenta(req, res) {
  try {
    // Quién consulta: siempre el dueño del token
    res.json(await service.obtenerMiCuenta({ id: req.auth.id, empresaId: req.auth.empresaId }));
  } catch (error) {
    responderError(res, error);
  }
}

// PATCH /api/portal/usuarios/mi-cuenta: actualiza nombres, apellidos y correo
export async function actualizarMiCuenta(req, res) {
  const { errores, datos } = validarEdicion(req.body);
  if (errores.length > 0) return res.status(400).json({ errores });

  try {
    res.json(await service.actualizarMiCuenta({ id: req.auth.id, empresaId: req.auth.empresaId }, datos));
  } catch (error) {
    responderError(res, error);
  }
}