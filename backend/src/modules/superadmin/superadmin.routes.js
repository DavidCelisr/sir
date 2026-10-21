import { Router } from 'express';
import { generar } from './invitaciones.controller.js';

const router = Router();

router.post('/invitaciones', generar);

export default router;