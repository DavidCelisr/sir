import { Router } from 'express';
import { soloRoles } from '../../middlewares/soloRoles.js';
import { listar, piezas, crear, ver, enviar } from './cotizaciones.controller.js';

// Ya llegan protegidas desde index.js (autenticar + soloEmpresa)
const router = Router();

// TODO el módulo es del Administrador y del Técnico Líder. Se protege en un solo punto
// (y no ruta por ruta) para que no se pueda olvidar ninguna. El Técnico recibe 403.
router.use(soloRoles('ADMINISTRADOR', 'TECNICO_LIDER'));

// /piezas va ANTES de /:id; si no, Express leería "piezas" como un id.
router.get('/piezas', piezas);
router.get('/', listar);
router.post('/', crear);
router.get('/:id', ver);
router.post('/:id/enviar', enviar);

// No hay PATCH ni DELETE: la cotización no se modifica ni se elimina.
// Además, un disparador de PostgreSQL lo impide aunque se llegue directo a la base de datos.

export default router;