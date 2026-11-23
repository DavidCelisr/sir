import { Routes, Route, Navigate } from 'react-router'
import RegistroEmpresa from './pages/RegistroEmpresa.jsx'
import Portal from './pages/Portal.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'
import Inicio from './pages/Inicio.jsx'
import CambiarPassword from './pages/CambiarPassword.jsx'
import ActualizarDatos from './pages/ActualizarDatos.jsx'
import Usuarios from './pages/Usuarios.jsx'
import UsuarioNuevo from './pages/UsuarioNuevo.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import RutaRol from './components/RutaRol.jsx'
import LayoutPortal from './components/LayoutPortal.jsx'
import { ADMIN_Y_LIDER } from './portal/menu.js'

// Mapa de pantallas: cada URL muestra una pantalla del documento de definición.
export default function App() {
  return (
    <Routes>
      {/* Pantalla 1: el enlace de invitación */}
      <Route path="/invitacion/:token" element={<RegistroEmpresa />} />

      {/* Pantalla 2: portal de ingreso (la bienvenida por correo apunta a /portal) */}
      <Route path="/portal" element={<Portal />} />

      {/* Provisional: el documento no define una página de inicio.
          Como el sistema es cerrado, la raíz lleva al portal. */}
      <Route path="/" element={<Navigate to="/portal" replace />} />

      {/* Todo lo que está aquí dentro exige sesión y usa la cabecera.
          Cada módulo nuevo agrega su ruta en este bloque. */}
      <Route element={<RutaProtegida><LayoutPortal /></RutaProtegida>}>
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/actualizar-datos" element={<ActualizarDatos />} />
        <Route path="/cambiar-password" element={<CambiarPassword />} />
        {/* Gestión de usuarios: Administrador y Técnico Líder (D-23, D-25) */}
        <Route path="/usuarios" element={<RutaRol roles={ADMIN_Y_LIDER}><Usuarios /></RutaRol>} />
        <Route path="/usuarios/nuevo" element={<RutaRol roles={ADMIN_Y_LIDER}><UsuarioNuevo /></RutaRol>} />
      </Route>

      {/* Cualquier otra dirección */}
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  )
}