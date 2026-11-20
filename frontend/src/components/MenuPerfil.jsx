import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'
import { ETIQUETAS_ROL } from '../constants/roles.js'
import { opcionesDelPerfilPara } from '../portal/menu.js'

// Iniciales para el círculo: "Marta Rojas Díaz" -> "MR"
const iniciales = (nombre) =>
  nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')

// Círculo de perfil con el panel de la cuenta:
//  1. Datos informativos: empresa, usuario y rol (solo se leen).
//  2. Opciones de trabajo según el rol: "Gestión de usuarios" (Administrador y Líder).
//  3. Opciones de cuenta: Cambiar contraseña y Cerrar sesión (los tres roles).
// Es un panel que se abre y se cierra (aria-expanded), y no un menú de opciones puras,
// porque mezcla texto informativo con acciones.
export default function MenuPerfil() {
  const { usuario, empresa, cerrarSesion } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef(null)
  const boton = useRef(null)
  const cerrar = () => setAbierto(false)

  // Con el panel abierto: se cierra al hacer clic fuera o al pulsar Escape
  useEffect(() => {
    if (!abierto) return
    const alHacerClic = (e) => {
      if (!contenedor.current?.contains(e.target)) setAbierto(false)
    }
    const alPulsarTecla = (e) => {
      if (e.key === 'Escape') {
        setAbierto(false)
        boton.current?.focus() // devuelve el foco al círculo
      }
    }
    document.addEventListener('mousedown', alHacerClic)
    document.addEventListener('keydown', alPulsarTecla)
    return () => {
      document.removeEventListener('mousedown', alHacerClic)
      document.removeEventListener('keydown', alPulsarTecla)
    }
  }, [abierto])

  return (
    <div className="menu-perfil" ref={contenedor}>
      <button
        id="boton-perfil"
        ref={boton}
        type="button"
        className="avatar"
        aria-label={`Menú de la cuenta de ${usuario.nombre}`}
        aria-expanded={abierto}
        aria-controls="panel-perfil"
        onClick={() => setAbierto((previo) => !previo)}
      >
        {iniciales(usuario.nombre)}
      </button>

      {abierto && (
        <div id="panel-perfil" className="desplegable">
          {/* Solo informativo: no tiene enlaces ni acciones */}
          <dl className="info-cuenta">
            <dt>Empresa</dt>
            <dd>{empresa.nombre}</dd>
            <dt>Usuario</dt>
            <dd>{usuario.nombreUsuario}</dd>
            <dt>Rol</dt>
            <dd>{ETIQUETAS_ROL[usuario.rol] ?? usuario.rol}</dd>
          </dl>

          {/* Solo para los roles que corresponden Administrador y Técnico Líder) */}
          {opcionesDelPerfilPara(usuario.rol).length > 0 && (
            <div className="grupo-opciones">
              {opcionesDelPerfilPara(usuario.rol).map((opcion) => (
                <Link key={opcion.ruta} to={opcion.ruta} onClick={cerrar}>{opcion.texto}</Link>
              ))}
            </div>
          )}

          <div className="grupo-opciones">
            <Link to="/cambiar-password" onClick={cerrar}>Cambiar contraseña</Link>
            {/* Función flecha: cerrarSesion() sin argumentos. Si recibiera el evento, lo tomaría como "motivo" */}
            <button type="button" onClick={() => { cerrar(); cerrarSesion() }}>Cerrar sesión</button>
          </div>
        </div>
      )}
    </div>
  )
}