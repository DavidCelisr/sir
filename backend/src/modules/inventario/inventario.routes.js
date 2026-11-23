import { Router } from 'express';
import { soloRoles } from '../../middlewares/soloRoles.js';
import { listar, ver, historial, crear, editar, ajustar, eliminar } from './inventario.controller.js';

// Ya llegan protegidas desde index.js (autenticar + soloEmpresa)
const router = Router();

// // Módulo exclusivo para Administrador y Técnico Líder, protegido de forma centralizada para restringir el acceso del Técnico, quien solo consulta las piezas desde los casos.
router.use(soloRoles('ADMINISTRADOR', 'TECNICO_LIDER'));

router.get('/', listar);
router.post('/', crear);
router.get('/:id', ver);
router.patch('/:id', editar);
router.post('/:id/ajuste', ajustar);
router.get('/:id/historial', historial);
router.delete('/:id', eliminar);

export default router;