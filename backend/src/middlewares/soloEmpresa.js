import { prisma } from '../lib/prisma.js';

// Deja pasar solo a usuarios de empresa con cuenta y empresa activas.
export async function soloEmpresa(req, res, next) {
  // El token de superadmin no trae empresaId: se rechaza aquí 
  if (req.auth?.tipo !== 'empresa' || !req.auth.empresaId) {
    return res.status(403).json({ error: 'Acceso no permitido' });
  }

  // El token puede seguir vigente aunque la cuenta o la empresa se hayan
  // desactivado después. Se consulta la base 
  // efecto de inmediato. Se filtra por id Y empresaId
  const usuario = await prisma.usuario.findFirst({
    where: { id: req.auth.id, empresaId: req.auth.empresaId },
    select: { activo: true, empresa: { select: { estado: true } } },
  });

  if (!usuario || !usuario.activo || usuario.empresa.estado !== 'ACTIVA') {
    return res.status(403).json({ error: 'Cuenta o empresa inactiva' });
  }

  next();
}