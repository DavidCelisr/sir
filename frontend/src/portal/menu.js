// Fuente única de lo que cada rol ve en el portal (RF-08).
export const TODOS_LOS_ROLES = ['ADMINISTRADOR', 'TECNICO_LIDER', 'TECNICO']
export const ADMIN_Y_LIDER = ['ADMINISTRADOR', 'TECNICO_LIDER']
export const SOLO_ADMINISTRADOR = ['ADMINISTRADOR']

// Cabecera: solo "Inicio". La cabecera no muestra datos del usuario ni de la empresa.
export const MENU = [{ ruta: '/inicio', texto: 'Inicio', roles: TODOS_LOS_ROLES }]

// Panel lateral: los MÓDULOS de trabajo, según el rol. Solo están los que ya existen;
// cada módulo agrega su línea cuando se construye, para no dejar enlaces que no llevan a ninguna parte.
// Previstos: Casos (todos los roles) · Clientes se consultan desde el buscador de Inicio y los casos.
//   Facturación y métricas (solo el Administrador) · Solicitudes de piezas (se decide con su módulo)
export const MODULOS = [
  { ruta: '/cotizaciones', texto: 'Cotizaciones', roles: ADMIN_Y_LIDER },
  { ruta: '/inventario', texto: 'Inventario', roles: ADMIN_Y_LIDER },
]

// Menú del círculo de perfil: la cuenta y las opciones de ADMINISTRACIÓN. Se muestran en este
// orden. Los módulos de trabajo NO van aquí.
export const OPCIONES_DEL_MENU_PERFIL = [
  { ruta: '/usuarios', texto: 'Gestión de usuarios', roles: ADMIN_Y_LIDER },
  // Sedes: solo el Administrador las gestiona. El Líder las elige al cotizar, sin ver esta opción.
  { ruta: '/sedes', texto: 'Gestión de sedes', roles: SOLO_ADMINISTRADOR },
]

const paraRol = (lista, rol) => lista.filter((opcion) => opcion.roles.includes(rol))
export const opcionesPara = (rol) => paraRol(MENU, rol)
export const modulosPara = (rol) => paraRol(MODULOS, rol)
export const opcionesDelPerfilPara = (rol) => paraRol(OPCIONES_DEL_MENU_PERFIL, rol)