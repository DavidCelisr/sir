import { useSesion } from '../auth/SesionContext.jsx'

const ROLES = {
  ADMINISTRADOR: 'Administrador de empresa',
  TECNICO_LIDER: 'Técnico Líder',
  TECNICO: 'Técnico',
}

// Pantalla de inicio del portal. Solo confirma que la sesión es válida y muestra los datos del usuario y la empresa. Permite cerrar sesión.
export default function Inicio() {
  const { usuario, empresa, cerrarSesion } = useSesion()
  return (
    <main>
      <h1>Bienvenido, {usuario.nombre}</h1>
      <p>Empresa: {empresa.nombre}</p>
      <p>Rol: {ROLES[usuario.rol] ?? usuario.rol}</p>
      {/* Se usa una función flecha: si se pasara cerrarSesion directo, recibiría el evento como "motivo" */}
      <button type="button" onClick={() => cerrarSesion()}>Cerrar sesión</button>
    </main>
  )
}