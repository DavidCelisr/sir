import { Router } from 'express';
import { soloRoles } from '../../middlewares/soloRoles.js';
import { listar, crear, editar, principal, eliminar } from './sedes.controller.js';

// Ya llegan protegidas desde index.js (autenticar + soloEmpresa)
const router = Router();

// el Administrador y el Técnico Líder LEEN la lista (el Líder elige la sede al cotizar). El Técnico no
// accede al módulo: ve la sede dentro del caso.
router.get('/', soloRoles('ADMINISTRADOR', 'TECNICO_LIDER'), listar);

// Crear, editar, designar la principal y eliminar: solo el Administrador.
router.post('/', soloRoles('ADMINISTRADOR'), crear);
router.patch('/:id', soloRoles('ADMINISTRADOR'), editar);
router.post('/:id/principal', soloRoles('ADMINISTRADOR'), principal);
router.delete('/:id', soloRoles('ADMINISTRADOR'), eliminar);

export default router;