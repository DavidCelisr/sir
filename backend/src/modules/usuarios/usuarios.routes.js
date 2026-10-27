import { Router } from 'express';
import { soloRoles } from '../../middlewares/soloRoles.js';
import { crearSubperfil } from './usuarios.controller.js';

// Ya llegan protegidas desde index.js (autenticar + soloEmpresa)
const router = Router();

// el Técnico no crea usuarios. Qué rol puede crear cada uno se decide en el service.
router.post('/', soloRoles('ADMINISTRADOR', 'TECNICO_LIDER'), crearSubperfil);

export default router;