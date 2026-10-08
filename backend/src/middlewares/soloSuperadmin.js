export function soloSuperadmin(req, res, next) {
  if (req.auth?.tipo !== 'superadmin') {
    return res.status(403).json({ error: 'Acceso no permitido' });
  }
  next();
}