import prismaClient from '@prisma/client';
import { normalizarDocumento, DOCUMENTO_VALIDO, MSG_DOCUMENTO } from '../../lib/documentos.js';

const { RolUsuario, TipoDocumento } = prismaClient;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const correoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
// Recorta y colapsa los espacios repetidos: "  Ana   María " -> "Ana María"
const nombreLimpio = (v) => texto(v).replace(/\s+/g, ' ');

// aquí NO se lee empresaId. se ignora a propósito.
// Crea un subperfil con datos personales y de acceso; el nombre completo se genera automáticamente y empresaId se obtiene de la sesión
export function validarSubperfil(body = {}) {
  const errores = [];

  const rol = body.rol;
  const nombres = nombreLimpio(body.nombres);
  const apellidos = nombreLimpio(body.apellidos);
  const tipoDocumento = body.tipoDocumento;
  const numeroDocumento = normalizarDocumento(body.numeroDocumento);
  const correo = texto(body.correo);
  const nombreUsuario = texto(body.nombreUsuario);
  // La contraseña no se recorta: los espacios pueden ser parte de la clave
  const password = typeof body.password === 'string' ? body.password : '';

  if (!Object.values(RolUsuario).includes(rol)) errores.push('rol no es un rol válido');
  if (!nombres) errores.push('nombres es obligatorio');
  if (!apellidos) errores.push('apellidos es obligatorio');
  if (!Object.values(TipoDocumento).includes(tipoDocumento)) {
    errores.push('tipoDocumento no es un tipo de documento válido');
  }
  if (!DOCUMENTO_VALIDO.test(numeroDocumento)) errores.push(`numeroDocumento ${MSG_DOCUMENTO}`);
  if (!correo) errores.push('correo es obligatorio');
  else if (!correoValido(correo)) errores.push('correo no tiene un formato válido');

  // Mismas reglas provisionales
  if (!/^[A-Za-z0-9._-]{4,30}$/.test(nombreUsuario)) {
    errores.push('nombreUsuario debe tener de 4 a 30 caracteres: letras, números, punto, guion o guion bajo');
  }
  // Máximo 72: bcrypt ignora lo que pase de ahí
  if (password.length < 8 || password.length > 72) {
    errores.push('password debe tener entre 8 y 72 caracteres');
  }

  return {
    errores,
    datos: { rol, nombres, apellidos, tipoDocumento, numeroDocumento, correo, nombreUsuario, password },
  };
}

// Revisa el cambio de contraseña que envía el cliente, sin tocar la base de datos.
export function validarCambioPassword(body = {}) {
  const errores = [];

  // Las contraseñas no se recortan: los espacios pueden ser parte de la clave
  const passwordActual = typeof body.passwordActual === 'string' ? body.passwordActual : '';
  const passwordNueva = typeof body.passwordNueva === 'string' ? body.passwordNueva : '';
  const confirmacionPassword = typeof body.confirmacionPassword === 'string' ? body.confirmacionPassword : '';

  // Todos los campos son obligatorios
  if (!passwordActual) errores.push('passwordActual es obligatoria');

  if (!passwordNueva) {
    errores.push('passwordNueva es obligatoria');
  } else if (passwordNueva.length < 8 || passwordNueva.length > 72) {
    // Máximo 72
    errores.push('passwordNueva debe tener entre 8 y 72 caracteres');
  }

  if (!confirmacionPassword) {
    errores.push('confirmacionPassword es obligatoria');
  } else if (passwordNueva && confirmacionPassword !== passwordNueva) {
    errores.push('confirmacionPassword no coincide con passwordNueva');
  }

  if (passwordActual && passwordNueva && passwordActual === passwordNueva) {
    errores.push('passwordNueva debe ser distinta de la actual');
  }

  // La confirmación solo sirve para comparar: el service no la necesita
  return { errores, datos: { passwordActual, passwordNueva } };
}
const ROLES = Object.values(RolUsuario);

// Filtro del listado: ?rol=TECNICO. Sin rol, se listan todos. Es lo único que se filtra:
// no hay filtro por estado porque no se manejan desactivaciones (D-21).
export function validarFiltroUsuarios(query = {}) {
  const { rol } = query;
  const errores = [];
  if (rol !== undefined && (typeof rol !== 'string' || !ROLES.includes(rol))) {
    errores.push('rol no es un rol válido');
  }
  return { errores, datos: { rol } };
}

// El id llega por la URL (/usuarios/:id). Debe ser un entero positivo que quepa en la columna.
// Devuelve el número, o null si no es válido.
export function validarIdUsuario(valor) {
  const id = Number(valor);
  return /^\d+$/.test(valor) && id > 0 && id <= 2147483647 ? id : null;
}

// Actualiza nombres, apellidos y correo; los demás campos no son editables
export function validarEdicion(body = {}) {
  const errores = [];
  const nombres = nombreLimpio(body.nombres);
  const apellidos = nombreLimpio(body.apellidos);
  const correo = texto(body.correo);

  if (!nombres) errores.push('nombres es obligatorio');
  if (!apellidos) errores.push('apellidos es obligatorio');
  if (!correo) errores.push('correo es obligatorio');
  else if (!correoValido(correo)) errores.push('correo no tiene un formato válido');

  return { errores, datos: { nombres, apellidos, correo } };
}