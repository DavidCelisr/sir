import { NavLink, Outlet } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'
import { opcionesPara } from '../portal/menu.js'
import MenuPerfil from './MenuPerfil.jsx'

// Estructura común de las pantallas del portal. La cabecera lleva SOLO tres cosas:
// el nombre del sistema, "Inicio" y el círculo de perfil en el extremo derecho.
// Los datos del usuario y de la empresa están dentro del menu
export default function LayoutPortal() {
  const { usuario } = useSesion()
  return (
    <>
      <header className="cabecera">
        <strong>SIR</strong>

        <nav aria-label="Principal">
          {opcionesPara(usuario.rol).map((opcion) => (
            <NavLink key={opcion.ruta} to={opcion.ruta}>{opcion.texto}</NavLink>
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