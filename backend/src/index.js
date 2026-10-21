import express from 'express';
import { login } from './modules/superadmin/superadmin.controller.js';
import { autenticar } from './middlewares/autenticar.js';
import { soloSuperadmin } from './middlewares/soloSuperadmin.js';
import rutasSuperadmin from './modules/superadmin/superadmin.routes.js';

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Ruta pública: 
app.post('/api/superadmin/login', login);
app.use('/api/superadmin', autenticar, soloSuperadmin, rutasSuperadmin);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`));