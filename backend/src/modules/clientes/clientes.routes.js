import { Router } from 'express';
import { soloRoles } from '../../middlewares/soloRoles.js';
import { buscar, porDocumento, ver, editar } from './clientes.controller.js';

// Ya llegan protegidas desde index.js (autenticar + soloEmpresa)
const router = Router();

// el buscador y la ficha los usan los TRES roles (solo consultan).
router.get('/', buscar);

// Recuperar un cliente por documento y corregir sus datos: solo Administrador y Técnico Líder.
// No hay POST (el cliente se registra al crear una cotización o un caso) ni DELETE (nunca se elimina).
// /por-documento va ANTES de /:id; si no, Express leería "por-documento" como un id.
router.get('/por-documento', soloRoles('ADMINISTRADOR', 'TECNICO_LIDER'), porDocumento);
router.get('/:id', ver);
router.patch('/:id', soloRoles('ADMINISTRADOR', 'TECNICO_LIDER'), editar);

export default router;