import { Routes, Route, Navigate } from 'react-router'
import RegistroEmpresa from './pages/RegistroEmpresa.jsx'
import Portal from './pages/Portal.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'

// Mapa de pantallas: cada URL muestra una pantalla del documento de definición.
export default function App() {
  return (
    <Routes>
      {/* Pantalla 1: el enlace de invitación */}
      <Route path="/invitacion/:token" element={<RegistroEmpresa />} />

      {/* Pantalla 2: portal de ingreso (la bienvenida por correo apunta a /portal) */}
      <Route path="/portal" element={<Portal />} />

      {/* Provisional: no se define una página de inicio.
          Como el sistema es cerrado, la raíz lleva al portal. */}
      <Route path="/" element={<Navigate to="/portal" replace />} />

      {/* Cualquier otra dirección */}
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  )
}