import { Routes, Route, Navigate } from 'react-router'
import RegistroEmpresa from './pages/RegistroEmpresa.jsx'
import Portal from './pages/Portal.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'
import Inicio from './pages/Inicio.jsx'
import CambiarPassword from './pages/CambiarPassword.jsx'
import ActualizarDatos from './pages/ActualizarDatos.jsx'
import Usuarios from './pages/Usuarios.jsx'
import UsuarioNuevo from './pages/UsuarioNuevo.jsx'
import Inventario from './pages/Inventario.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import RutaRol from './components/RutaRol.jsx'
import LayoutPortal from './components/LayoutPortal.jsx'
import { ADMIN_Y_LIDER, SOLO_ADMINISTRADOR } from './portal/menu.js'
import PiezaNueva from './pages/PiezaNueva.jsx'
import Cotizaciones from './pages/Cotizaciones.jsx'
import CotizacionNueva from './pages/CotizacionNueva.jsx'
import CotizacionDetalle from './pages/CotizacionDetalle.jsx'
import Sedes from './pages/Sedes.jsx'
import SedeNueva from './pages/SedeNueva.jsx'
import SedeEditar from './pages/SedeEditar.jsx'

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
        {/* Gestión de usuarios: Administrador y Técnico Líder */}
        <Route path="/usuarios" element={<RutaRol roles={ADMIN_Y_LIDER}><Usuarios /></RutaRol>} />
        <Route path="/usuarios/nuevo" element={<RutaRol roles={ADMIN_Y_LIDER}><UsuarioNuevo /></RutaRol>} />
        {/* Módulos del panel lateral. Inventario: Administrador y Técnico Líder */}
        <Route path="/inventario" element={<RutaRol roles={ADMIN_Y_LIDER}><Inventario /></RutaRol>} />
        <Route path="/inventario/nueva" element={<RutaRol roles={ADMIN_Y_LIDER}><PiezaNueva /></RutaRol>} />
        {/* Cotizaciones: Administrador y Técnico Líder */}
        <Route path="/cotizaciones" element={<RutaRol roles={ADMIN_Y_LIDER}><Cotizaciones /></RutaRol>} />
        <Route path="/cotizaciones/nueva" element={<RutaRol roles={ADMIN_Y_LIDER}><CotizacionNueva /></RutaRol>} />
        <Route path="/cotizaciones/:id" element={<RutaRol roles={ADMIN_Y_LIDER}><CotizacionDetalle /></RutaRol>} />
        {/* Sedes: solo el Administrador */}
        <Route path="/sedes" element={<RutaRol roles={SOLO_ADMINISTRADOR}><Sedes /></RutaRol>} />
        <Route path="/sedes/nueva" element={<RutaRol roles={SOLO_ADMINISTRADOR}><SedeNueva /></RutaRol>} />
        <Route path="/sedes/:id/editar" element={<RutaRol roles={SOLO_ADMINISTRADOR}><SedeEditar /></RutaRol>} />
      </Route>

      {/* Cualquier otra dirección */}
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  )
}