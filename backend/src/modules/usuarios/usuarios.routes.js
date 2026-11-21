import { Router } from 'express';
import { soloRoles } from '../../middlewares/soloRoles.js';
import {
  crearSubperfil, cambiarPassword, listar, editar, eliminar, verMiCuenta, actualizarMiCuenta,
} from './usuarios.controller.js';

// Ya llegan protegidas desde index.js (autenticar + soloEmpresa)
const router = Router();

// RF-13: el Técnico no crea usuarios. Qué rol puede crear cada uno se decide en el service.
router.post('/', soloRoles('ADMINISTRADOR', 'TECNICO_LIDER'), crearSubperfil);

// Rutas para gestionar la cuenta propia de cualquier usuario de la empresa.
// Se declaran antes de las rutas con :id para evitar conflictos de coincidencia.
router.patch('/mi-password', cambiarPassword);
router.get('/mi-cuenta', verMiCuenta);
router.patch('/mi-cuenta', actualizarMiCuenta);

// gestión de usuarios. Solo el Administrador; el Líder y el Técnico reciben 403.
router.get('/', soloRoles('ADMINISTRADOR'), listar);
router.patch('/:id', soloRoles('ADMINISTRADOR'), editar);
router.delete('/:id', soloRoles('ADMINISTRADOR'), eliminar);

export default router;