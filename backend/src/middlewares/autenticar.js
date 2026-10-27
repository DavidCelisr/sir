import jwt from 'jsonwebtoken';

// Verifica que el token sea válido y deja sus datos en req.auth.
// No decide quién puede entrar: eso lo hacen soloSuperadmin y soloEmpresa.
export function autenticar(req, res, next) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');

  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    // rol y empresaId solo existen en tokens de empresa 
    // Siempre salen del token firmado, nunca del body 
    req.auth = {
      id: Number(payload.sub),
      tipo: payload.tipo,
      rol: payload.rol,
      empresaId: payload.empresaId,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o vencido' });
  }
}