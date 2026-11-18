// Guarda el token en sessionStorage: sobrevive a una recarga pero
// se borra al cerrar la pestaña. Cada pestaña tiene su propia sesión.
const CLAVE = 'sir.token'

// sessionStorage puede lanzar errores si el navegador no lo soporta o si el usuario lo bloquea.
// se protege cada acceso para que la pantalla no se rompa.
export const guardarToken = (token) => { try { sessionStorage.setItem(CLAVE, token) } catch { /* sin almacenamiento */ } }
export const leerToken = () => { try { return sessionStorage.getItem(CLAVE) } catch { return null } }
export const borrarToken = () => { try { sessionStorage.removeItem(CLAVE) } catch { /* sin almacenamiento */ } }

// Lee la fecha de expiracion
// solo sirve para la experiencia de usuario, la firma solo la puede comprobar el backend.
export function expiracionToken(token) {
  try {
    const carga = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(carga))
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}