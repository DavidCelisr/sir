import { Router } from 'express';
import { login } from './auth.controller.js';

// Rutas PÚBLICAS: el login es lo que genera el token.
const router = Router();

router.post('/login', login);

export default router;