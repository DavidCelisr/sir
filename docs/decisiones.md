D-01. Autenticación del Superadministrador

Tabla propia Superadministrador (sin empresa_id); los usuarios de empresa siguen en la tabla de usuarios con empresa_id obligatorio.
Se crea únicamente por seed; no existe endpoint de creación.
Login separado (/api/superadmin/login), distinto del portal.
JWT con campo tipo (superadmin o empresa). El de empresa incluye rol y empresaId; el de superadmin no.
Middleware: autenticar, soloEmpresa (toma empresaId del JWT) y soloSuperadmin. Cada grupo de rutas rechaza el tipo de token que no le corresponde.
El Superadministrador solo accede a empresas, contratos, invitaciones y datos básicos del usuario principal; nunca a tablas operativas.
Pendientes: tiempo de expiración del JWT y dónde se guarda en el cliente; si una empresa inactiva bloquea el login o solo las operaciones nuevas (RN-29).

D-05. Invitaciones

El Superadministrador genera la invitación (POST sin cuerpo); el token es un UUID con vigencia fija de 24 horas calculada en el servidor.
El enlace se arma con la variable FRONTEND_URL.
Pendiente: reenviar invitación (cómo y si genera token nuevo; UC-04). No definido: listar invitaciones.