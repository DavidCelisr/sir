import { Navigate } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'
import EstadoSesion from './EstadoSesion.jsx'

// Envuelve las pantallas que exigen sesión: sin sesión, lleva al portal.
export default function RutaProtegida({ children }) {
  const { estado, reintentar } = useSesion()

  if (estado === 'verificando' || estado === 'sin-conexion') {
    return <EstadoSesion estado={estado} reintentar={reintentar} />
  }
  if (estado === 'anonimo') return <Navigate to="/portal" replace />
  return children
}