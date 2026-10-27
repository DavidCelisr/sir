// Deja pasar solo a los roles indicados. Va DESPUÉS de autenticar y soloEmpresa,
export function soloRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.auth?.rol)) {
      return res.status(403).json({ error: 'No tiene permiso para esta acción' });
    }
    next();
  };
}