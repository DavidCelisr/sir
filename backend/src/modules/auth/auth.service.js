import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { ErrorNegocio } from '../../lib/errores.js';

// Hash de relleno: si el usuario no existe se compara contra este, para que la
// respuesta tarde lo mismo y no se pueda deducir qué usuarios existen.
const HASH_FALSO = bcrypt.hashSync('clave-que-nadie-usa', 12);

// login de los usuarios de empresa
export async function login(nombreUsuario, password) {
  const usuario = await prisma.usuario.findUnique({
    where: { nombreUsuario },
    include: { empresa: { select: { estado: true } } },
  });

  const claveCorrecta = await bcrypt.compare(password, usuario ? usuario.passwordHash : HASH_FALSO);

  // Mismo mensaje para usuario inexistente y clave incorrecta
  if (!usuario || !claveCorrecta) {
    throw new ErrorNegocio(401, 'Credenciales incorrectas');
  }

  // Solo se llega aquí con la clave correcta. Respuestas PROVISIONALES
  if (!usuario.activo) throw new ErrorNegocio(403, 'La cuenta está desactivada');
  if (usuario.empresa.estado !== 'ACTIVA') throw new ErrorNegocio(403, 'La empresa está inactiva');

  // Token de empresa: lleva tipo, rol y empresaId. El empresaId sale
  // de la base de datos, nunca de lo que envía el cliente.
  const token = jwt.sign(
    { tipo: 'empresa', rol: usuario.rol, empresaId: usuario.empresaId },
    process.env.JWT_SECRET,
    { subject: String(usuario.id), expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  );

  // El frontend usa nombre y rol para mostrar las opciones del menú
  return {
    token,
    usuario: { nombre: usuario.nombre, nombreUsuario: usuario.nombreUsuario, rol: usuario.rol },
  };
}