import { prisma } from '../../lib/prisma.js';

const VIGENCIA_HORAS = 24; // RT-02: expiración fija de 24 horas

export async function generarInvitacion() {
  const urlBase = process.env.FRONTEND_URL;
  if (!urlBase) throw new Error('Falta FRONTEND_URL en el .env');

  const expiraEn = new Date(Date.now() + VIGENCIA_HORAS * 60 * 60 * 1000);

  // El token (UUID) lo genera Prisma, según el esquema
  const invitacion = await prisma.invitacion.create({ data: { expiraEn } });

  return {
    id: invitacion.id,
    token: invitacion.token,
    enlace: `${urlBase}/invitacion/${invitacion.token}`,
    creadaEn: invitacion.creadaEn,
    expiraEn: invitacion.expiraEn,
  };
}