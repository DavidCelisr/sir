import { prisma } from '../../lib/prisma.js';

// Una invitación es utilizable si cumple las TRES condiciones:
//  1. existe
//  2. no ha sido usada (RN-30: se marca usada al completar el registro)
//  3. no ha vencido (RT-02: vigencia de 24 horas)
// Si falla cualquiera, devuelve null.
// Está separada del controller porque el registro de la empresa

export async function buscarInvitacionVigente(token) {
  return prisma.invitacion.findFirst({
    where: {
      token,
      usadaEn: null,
      expiraEn: { gt: new Date() }, // "gt" = mayor que: vence en el futuro
    },
  });
}