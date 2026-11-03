const texto = (v) => (typeof v === 'string' ? v.trim() : '');

// Revisa el formato de lo que envía el cliente, sin tocar la base de datos.
export function validarSolicitud(body = {}) {
  const nombreUsuario = texto(body.nombreUsuario);
  const errores = nombreUsuario ? [] : ['nombreUsuario es obligatorio'];
  return { errores, datos: { nombreUsuario } };
}

// Las reglas de la nueva clave son las mismas que para el registro de usuario, pero no se recortan los espacios: pueden ser parte de la clave.
export function validarRestablecer(body = {}) {
  const errores = [];

  const nombreUsuario = texto(body.nombreUsuario);
  const codigo = texto(body.codigo);
  // Las contraseñas no se recortan: los espacios pueden ser parte de la clave
  const passwordNueva = typeof body.passwordNueva === 'string' ? body.passwordNueva : '';
  const confirmacionPassword = typeof body.confirmacionPassword === 'string' ? body.confirmacionPassword : '';

  if (!nombreUsuario) errores.push('nombreUsuario es obligatorio');

  // El código es de 6 dígitos
  if (!/^\d{6}$/.test(codigo)) errores.push('codigo debe tener 6 dígitos');

  if (!passwordNueva) {
    errores.push('passwordNueva es obligatoria');
  } else if (passwordNueva.length < 8 || passwordNueva.length > 72) {
    // Máximo 72: 
    errores.push('passwordNueva debe tener entre 8 y 72 caracteres');
  }

  if (!confirmacionPassword) {
    errores.push('confirmacionPassword es obligatoria');
  } else if (passwordNueva && confirmacionPassword !== passwordNueva) {
    errores.push('confirmacionPassword no coincide con passwordNueva');
  }

  return { errores, datos: { nombreUsuario, codigo, passwordNueva } };
}