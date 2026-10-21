import prismaClient from '@prisma/client';

const { TipoDocumento } = prismaClient;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

// Revisa el formato de lo que envía el cliente, sin tocar la base de datos.
export function validarUsuarioPrincipal(body = {}) {
  const errores = [];

  const tipoDocumento = body.tipoDocumento;
  const numeroDocumento = texto(body.numeroDocumento);
  const nombreUsuario = texto(body.nombreUsuario);
  // La contraseña NO se recorta: los espacios pueden ser parte de la clave
  const password = typeof body.password === 'string' ? body.password : '';

  if (!Object.values(TipoDocumento).includes(tipoDocumento)) {
    errores.push('tipoDocumento no es un tipo de documento válido');
  }
  if (!numeroDocumento) errores.push('numeroDocumento es obligatorio');

  // Reglas 
  if (!/^[A-Za-z0-9._-]{4,30}$/.test(nombreUsuario)) {
    errores.push('nombreUsuario debe tener de 4 a 30 caracteres: letras, números, punto, guion o guion bajo');
  }
  // Máximo 72
  if (password.length < 8 || password.length > 72) {
    errores.push('password debe tener entre 8 y 72 caracteres');
  }

  return { errores, datos: { tipoDocumento, numeroDocumento, nombreUsuario, password } };
}