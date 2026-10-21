import { Router } from 'express';
import { validarInvitacion, registrarEmpresa } from './registro.controller.js';
import { crearUsuarioPrincipal } from './usuarioPrincipal.controller.js';

// Rutas PÚBLICAS: quien se registra aún no tiene usuario ni JWT.
const router = Router();

router.get('/invitaciones/:token', validarInvitacion);
router.post('/empresas', registrarEmpresa);
router.post('/usuario-principal', crearUsuarioPrincipal);

export default router;