import prismaClient from '@prisma/client';

const { RolUsuario } = prismaClient;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const correoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Revisa el formato de lo que envía el cliente, sin tocar la base de datos.
// aquí NO se lee empresaId. se ignora a propósito.
export function validarSubperfil(body = {}) {
  const errores = [];

  const rol = body.rol;
  const nombre = texto(body.nombre);
  const correo = texto(body.correo);
  const nombreUsuario = texto(body.nombreUsuario);
  // La contraseña no se recorta: los espacios pueden ser parte de la clave
  const password = typeof body.password === 'string' ? body.password : '';

  if (!Object.values(RolUsuario).includes(rol)) errores.push('rol no es un rol válido');
  if (!nombre) errores.push('nombre es obligatorio');
  if (!correo) errores.push('correo es obligatorio');
  else if (!correoValido(correo)) errores.push('correo no tiene un formato válido');

  if (!/^[A-Za-z0-9._-]{4,30}$/.test(nombreUsuario)) {
    errores.push('nombreUsuario debe tener de 4 a 30 caracteres: letras, números, punto, guion o guion bajo');
  }
  // Máximo 72 caracteres porque bcrypt no admite más de 72
  if (password.length < 8 || password.length > 72) {
    errores.push('password debe tener entre 8 y 72 caracteres');
  }

  return { errores, datos: { rol, nombre, correo, nombreUsuario, password } };
}