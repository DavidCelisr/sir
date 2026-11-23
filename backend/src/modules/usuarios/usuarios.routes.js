import { Router } from 'express';
import { soloRoles } from '../../middlewares/soloRoles.js';
import {
  crearSubperfil, cambiarPassword, listar, eliminar, verMiCuenta, actualizarMiCuenta,
} from './usuarios.controller.js';

// Ya llegan protegidas desde index.js (autenticar + soloEmpresa)
const router = Router();

// el Técnico no crea usuarios. Qué rol puede crear cada uno se decide en el service.
router.post('/', soloRoles('ADMINISTRADOR', 'TECNICO_LIDER'), crearSubperfil);

// Rutas para que cada usuario gestione su propia cuenta.
// Van antes de las rutas con :id para evitar conflictos.
router.patch('/mi-password', cambiarPassword);
router.get('/mi-cuenta', verMiCuenta);
router.patch('/mi-cuenta', actualizarMiCuenta);

// el listado lo consultan el Administrador y el Técnico Líder (este solo ve Técnicos);
// el Técnico recibe 403. Eliminar es solo del Administrador.
// Ya no existe PATCH /:id: el Administrador no edita a otros usuarios.
router.get('/', soloRoles('ADMINISTRADOR', 'TECNICO_LIDER'), listar);
router.delete('/:id', soloRoles('ADMINISTRADOR'), eliminar);

export default router;