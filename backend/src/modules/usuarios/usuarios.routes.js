import { Router } from 'express';
import { soloRoles } from '../../middlewares/soloRoles.js';
import {
  crearSubperfil, cambiarPassword, listar, editar, eliminar,
} from './usuarios.controller.js';

// Ya llegan protegidas desde index.js (autenticar + soloEmpresa)
const router = Router();

// el Técnico no crea usuarios. Qué rol puede crear cada uno se decide en el service.
router.post('/', soloRoles('ADMINISTRADOR', 'TECNICO_LIDER'), crearSubperfil);

// cualquier usuario de empresa cambia SU contraseña; la cuenta sale del token.
// Va ANTES de las rutas con :id; si no, Express leería "mi-password" como un id.
router.patch('/mi-password', cambiarPassword);

// gestión de usuarios. Solo el Administrador; el Líder y el Técnico reciben 403.
router.get('/', soloRoles('ADMINISTRADOR'), listar);
router.patch('/:id', soloRoles('ADMINISTRADOR'), editar);
router.delete('/:id', soloRoles('ADMINISTRADOR'), eliminar);

export default router;