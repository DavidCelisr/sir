import { NavLink, Outlet } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'
import { opcionesPara } from '../portal/menu.js'
import MenuLateral from './MenuLateral.jsx'
import MenuPerfil from './MenuPerfil.jsx'

// Estructura común del portal con cabecera, navegación según el rol, menú lateral y perfil del usuario.
export default function LayoutPortal() {
  const { usuario } = useSesion()
  return (
    <>
      <header className="cabecera">
        <MenuLateral />

        <strong>SIR</strong>

        <nav aria-label="Principal" className="nav-principal">
          {opcionesPara(usuario.rol).map((opcion) => (
            <NavLink key={opcion.ruta} to={opcion.ruta}>
              {opcion.texto}
            </NavLink>
          ))}
        </nav>

        <MenuPerfil />
      </header>

      <main>
        <Outlet />
      </main>
    </>
  )
}