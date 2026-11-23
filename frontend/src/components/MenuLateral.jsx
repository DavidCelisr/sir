import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'
import { modulosPara } from '../portal/menu.js'

// Botón y panel lateral con las opciones disponibles según el rol del usuario.
export default function MenuLateral() {
  const { usuario } = useSesion()
  const { pathname } = useLocation()
  const dialogo = useRef(null)
  const [abierto, setAbierto] = useState(false)
  const opciones = modulosPara(usuario.rol)

  // Si la dirección cambia con el panel abierto (por ejemplo, con el botón "atrás"), se cierra
  useEffect(() => {
    if (dialogo.current?.open) dialogo.current.close()
  }, [pathname])

  // Un rol sin módulos no ve el icono
  if (opciones.length === 0) return null

  const abrir = () => {
    dialogo.current.showModal()
    setAbierto(true)
  }
  // close() dispara el evento "close", que actualiza el estado (también cuando se cierra con Esc)
  const cerrar = () => dialogo.current?.close()

  return (
    <>
      <button
        id="boton-menu"
        type="button"
        className="boton-menu"
        aria-label="Abrir menú de módulos"
        aria-expanded={abierto}
        aria-controls="panel-modulos"
        onClick={abrir}
      >
        ☰
      </button>

      <dialog
        id="panel-modulos"
        ref={dialogo}
        className="panel-lateral"
        aria-labelledby="titulo-panel-modulos"
        onClose={() => setAbierto(false)}
        // Un clic fuera del panel llega al <dialog> mismo (no tiene relleno propio): se cierra
        onClick={(e) => { if (e.target === e.currentTarget) cerrar() }}
      >
        <div className="panel-contenido">
          <div className="panel-cabecera">
            <h2 id="titulo-panel-modulos">Módulos</h2>
            <button type="button" aria-label="Cerrar menú de módulos" onClick={cerrar}>✕</button>
          </div>

          <nav aria-label="Módulos" className="nav-modulos">
            <ul>
              {opciones.map((opcion) => (
                <li key={opcion.ruta}>
                  {/* Al elegir una opción se navega y el panel se cierra */}
                  <NavLink to={opcion.ruta} onClick={cerrar}>{opcion.texto}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  )
}