import { Link } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'

// Protege una pantalla por rol. UX: la autoridad es el backend
// (soloRoles), que ya responde 403 aunque alguien llame a la API directamente.
// Se muestra un aviso y no se redirige en silencio, para que se entienda qué pasó.
export default function RutaRol({ roles, children }) {
  const { usuario } = useSesion()

  if (!roles.includes(usuario.rol)) {
    return (
      <section>
        <h1>Acceso no permitido</h1>
        <p>No tiene permiso para ver esta pantalla.</p>
        <Link to="/inicio">Volver al inicio</Link>
      </section>
    )
  }
  return children
}