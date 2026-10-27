import express from 'express';
import { login } from './modules/superadmin/superadmin.controller.js';
import { autenticar } from './middlewares/autenticar.js';
import { soloSuperadmin } from './middlewares/soloSuperadmin.js';
import rutasSuperadmin from './modules/superadmin/superadmin.routes.js';
import rutasRegistro from './modules/registro/registro.routes.js';
import rutasAuth from './modules/auth/auth.routes.js';
import { soloEmpresa } from './middlewares/soloEmpresa.js';
import rutasUsuarios from './modules/usuarios/usuarios.routes.js';

const app = express();
app.use(express.json());

// --- RUTAS PÚBLICAS (sin token) ---
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.post('/api/superadmin/login', login); // el token nace aquí
app.use('/api/registro', rutasRegistro); // la empresa se registra con el token del enlace
app.use('/api/auth', rutasAuth); // login de usuarios de empresa

// --- RUTAS PROTEGIDAS (con token) ---
// Superadministrador: token válido y de tipo "superadmin"
app.use('/api/superadmin', autenticar, soloSuperadmin, rutasSuperadmin);

// Aquí irá el portal de las empresas (autenticar + soloEmpresa)
// Portal de las empresas: token válido, de tipo "empresa", con cuenta y empresa activas
const rutasPortal = express.Router();
rutasPortal.use('/usuarios', rutasUsuarios);
app.use('/api/portal', autenticar, soloEmpresa, rutasPortal);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`));