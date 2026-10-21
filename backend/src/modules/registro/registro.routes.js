import { Router } from 'express';
import { validarInvitacion } from './registro.controller.js';

// Rutas PÚBLICAS: quien se registra aún no tiene usuario ni JWT.
const router = Router();

router.get('/invitaciones/:token', validarInvitacion);

export default router;