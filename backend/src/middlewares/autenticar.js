import jwt from 'jsonwebtoken';

export function autenticar(req, res, next) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');

  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.auth = { id: Number(payload.sub), tipo: payload.tipo };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o vencido' });
  }
}