// Fuente única de lo que cada rol ve en el portal
export const TODOS_LOS_ROLES = ['ADMINISTRADOR', 'TECNICO_LIDER', 'TECNICO']
export const ADMIN_Y_LIDER = ['ADMINISTRADOR', 'TECNICO_LIDER']

// Cabecera: solo "Inicio". La cabecera no muestra datos del usuario ni de la empresa.
export const MENU = [{ ruta: '/inicio', texto: 'Inicio', roles: TODOS_LOS_ROLES }]

// Opciones de trabajo dentro del menú del círculo de perfil, según el rol.
// "Gestión de usuarios" la ven el Administrador y el Técnico Líder. Qué puede hacer cada uno
// dentro de esa pantalla (por ejemplo, eliminar solo el Administrador) lo define la pantalla.
export const OPCIONES_DEL_MENU_PERFIL = [
  { ruta: '/usuarios', texto: 'Gestión de usuarios', roles: ADMIN_Y_LIDER },
]

const paraRol = (lista, rol) => lista.filter((opcion) => opcion.roles.includes(rol))
export const opcionesPara = (rol) => paraRol(MENU, rol)
export const opcionesDelPerfilPara = (rol) => paraRol(OPCIONES_DEL_MENU_PERFIL, rol)