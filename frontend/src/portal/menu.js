// Fuente única de lo que cada rol ve en el portal.
export const TODOS_LOS_ROLES = ['ADMINISTRADOR', 'TECNICO_LIDER', 'TECNICO']
export const ADMIN_Y_LIDER = ['ADMINISTRADOR', 'TECNICO_LIDER']

// Cabecera: solo "Inicio". La cabecera no muestra datos del usuario ni de la empresa.
export const MENU = [{ ruta: '/inicio', texto: 'Inicio', roles: TODOS_LOS_ROLES }]

// Panel lateral UX: los MÓDULOS de trabajo, según el rol. Solo están los que ya existen;
// cada módulo agrega su línea cuando se construye, para no dejar enlaces que no llevan a ninguna parte.
// Previstos, según los permisos de la definición:
//   Casos (todos los roles) · Cotizaciones y Clientes (Administrador y Líder) ·
//   Facturación y métricas (solo el Administrador) · Solicitudes de piezas (se decide con su módulo)
export const MODULOS = [
  { ruta: '/cotizaciones', texto: 'Cotizaciones', roles: ADMIN_Y_LIDER },
  { ruta: '/inventario', texto: 'Inventario', roles: ADMIN_Y_LIDER },
]

// Menú del círculo de perfil: la cuenta y "Gestión de usuarios". Los módulos NO van aquí.
export const OPCIONES_DEL_MENU_PERFIL = [
  { ruta: '/usuarios', texto: 'Gestión de usuarios', roles: ADMIN_Y_LIDER },
]

const paraRol = (lista, rol) => lista.filter((opcion) => opcion.roles.includes(rol))
export const opcionesPara = (rol) => paraRol(MENU, rol)
export const modulosPara = (rol) => paraRol(MODULOS, rol)
export const opcionesDelPerfilPara = (rol) => paraRol(OPCIONES_DEL_MENU_PERFIL, rol)