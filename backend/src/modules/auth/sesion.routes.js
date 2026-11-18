import { Router } from 'express';
import { obtenerSesion } from './sesion.controller.js';

// Ya llega protegida desde index.js (autenticar + soloEmpresa)
const router = Router();

router.get('/', obtenerSesion);

export default router;