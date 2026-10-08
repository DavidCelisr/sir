import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';

export async function login(nombreUsuario, password) {
  const superadmin = await prisma.superadministrador.findUnique({
    where: { nombreUsuario },
  });

  const credencialesValidas =
    superadmin && (await bcrypt.compare(password, superadmin.passwordHash));

  if (!credencialesValidas) return null;

  return jwt.sign({ tipo: 'superadmin' }, process.env.JWT_SECRET, {
    subject: String(superadmin.id),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}