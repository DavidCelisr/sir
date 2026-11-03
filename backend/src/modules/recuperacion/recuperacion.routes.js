import { Router } from 'express';
import { solicitar, restablecer } from './recuperacion.controller.js';

// Rutas PÚBLICAS: quien olvido su clave no tiene token.
const router = Router();

router.post('/solicitar', solicitar);
router.post('/restablecer', restablecer);

export default router;