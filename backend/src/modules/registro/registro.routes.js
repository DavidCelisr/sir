import { Router } from 'express';
import { validarInvitacion, registrarEmpresa } from './registro.controller.js';

// Rutas PÚBLICAS: quien se registra aún no tiene usuario ni JWT.
const router = Router();

router.get('/invitaciones/:token', validarInvitacion);
router.post('/empresas', registrarEmpresa);

export default router;